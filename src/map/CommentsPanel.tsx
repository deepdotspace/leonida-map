/**
 * The panel on the right of the map with what visitors say about the open
 * place, as threads: a comment, the replies to it, the replies to those.
 * Anyone reads; posting, replying and upvoting need an account. Comments
 * travel through the worker (src/server/comment-routes.ts), so reading opens
 * no connection.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowBigUp, MessageCircle, PanelRightClose, Plus, Reply, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage, Button, ConfirmModal, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { COMMENT_MAX } from '../schemas/comments-schema'
import type { PinComment } from '../server/comment-routes'
import { IconBadge } from './IconBadge'
import type { Pin } from './pins'

/** Gives the signed-in visitor's token for a request, or null when nobody is signed in. */
export type GetToken = () => Promise<string | null>

interface CommentsPanelProps {
  pin: Pin
  /** Null while the visitor is signed out. */
  getToken: GetToken | null
  onSignIn: () => void
  onClose: () => void
  /** Told how many comments the place has, for the card's button. */
  onCountChange: (count: number) => void
}

interface Thread extends PinComment {
  replies: Thread[]
}

/** What a comment's buttons do. Each sends the visitor to sign in when they are signed out. */
interface Actions {
  signedIn: boolean
  onSignIn: () => void
  /** Resolves to whether the comment was posted. */
  post: (text: string, parentId: string) => Promise<boolean>
  vote: (id: string) => void
  remove: (id: string) => void
}

/** Replies to a comment this deep are shown beside it, so a long exchange does not run out of width. */
const MAX_DEPTH = 5

const UNITS: Array<[string, number]> = [
  ['y', 31_536_000],
  ['mo', 2_592_000],
  ['d', 86_400],
  ['h', 3600],
  ['m', 60],
]

function timeAgo(at: string): string {
  const seconds = (Date.now() - new Date(at).getTime()) / 1000
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${unit} ago`
  }
  return 'just now'
}

/** The flat list as threads, the most upvoted first and then the newest. A deleted comment is kept only while it has replies. */
function toThreads(comments: PinComment[]): Thread[] {
  const byId = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] as Thread[] }]))
  const top: Thread[] = []
  for (const thread of byId.values()) (byId.get(thread.parentId)?.replies ?? top).push(thread)
  const tidy = (threads: Thread[]): Thread[] =>
    threads
      .map((thread) => ({ ...thread, replies: tidy(thread.replies) }))
      .filter((thread) => !thread.deleted || thread.replies.length > 0)
      .sort((a, b) => b.votes - a.votes || b.at.localeCompare(a.at))
  return tidy(top)
}

function replyCount(thread: Thread): number {
  return thread.replies.reduce((total, reply) => total + 1 + replyCount(reply), 0)
}

const actionClass =
  'inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'

interface ComposerProps {
  placeholder: string
  autoFocus?: boolean
  onPost: (text: string) => Promise<boolean>
  onCancel?: () => void
}

function Composer({ placeholder, autoFocus, onPost, onCancel }: ComposerProps) {
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const post = async () => {
    setPosting(true)
    if (await onPost(draft)) {
      setDraft('')
      onCancel?.()
    }
    setPosting(false)
  }
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        data-testid="comment-draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={COMMENT_MAX}
        rows={2}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-xs tabular-nums text-muted-foreground">
          {draft.length} / {COMMENT_MAX} · Shown with your name and photo
        </span>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" data-testid="comment-post" onClick={post} disabled={!draft.trim()} loading={posting}>
          {onCancel ? 'Reply' : 'Post'}
        </Button>
      </div>
    </div>
  )
}

function CommentThread({ thread, depth, actions }: { thread: Thread; depth: number; actions: Actions }) {
  const [collapsed, setCollapsed] = useState(false)
  const [replying, setReplying] = useState(false)
  const hidden = replyCount(thread)
  const byline = (
    <p className="flex h-6 items-baseline gap-1.5 leading-6">
      <span className={cn('truncate text-sm font-semibold', thread.deleted ? 'text-muted-foreground' : 'text-foreground')}>{thread.name}</span>
      <time className="shrink-0 text-xs text-muted-foreground">· {timeAgo(thread.at)}</time>
      {collapsed && hidden > 0 && <span className="shrink-0 text-xs text-muted-foreground">· {hidden === 1 ? '1 reply' : `${hidden} replies`}</span>}
    </p>
  )

  if (collapsed) {
    return (
      <li data-testid="comment" className="flex gap-2 pt-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Show thread"
          title="Show thread"
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus size={12} />
        </button>
        {byline}
      </li>
    )
  }

  return (
    <li data-testid="comment" className="flex gap-2 pt-3">
      <div className="flex shrink-0 flex-col items-center">
        <Avatar className="size-6">
          <AvatarImage src={thread.imageUrl || undefined} referrerPolicy="no-referrer" />
          <AvatarFallback className="text-[10px] font-semibold">{thread.deleted ? '' : thread.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {/* The line down the side of a thread; clicking it folds the thread away. */}
        <button type="button" onClick={() => setCollapsed(true)} aria-label="Hide thread" title="Hide thread" className="group w-4 flex-1 cursor-pointer">
          <span className="mx-auto block h-full w-px bg-border transition-colors group-hover:bg-primary" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        {byline}
        {thread.deleted ? (
          <p className="text-sm italic text-muted-foreground">Comment deleted</p>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{thread.text}</p>
            <div className="-ml-1.5 mt-0.5 flex items-center gap-1">
              <button
                type="button"
                data-testid="comment-upvote"
                aria-pressed={thread.voted}
                aria-label={thread.votes === 1 ? 'Upvote, 1 vote' : `Upvote, ${thread.votes} votes`}
                title="Upvote"
                onClick={() => actions.vote(thread.id)}
                className={cn(actionClass, thread.voted && 'text-primary hover:text-primary')}
              >
                <ArrowBigUp size={16} fill={thread.voted ? 'currentColor' : 'none'} />
                {thread.votes > 0 && <span className="tabular-nums">{thread.votes}</span>}
              </button>
              <button
                type="button"
                data-testid="comment-reply"
                onClick={() => (actions.signedIn ? setReplying(true) : actions.onSignIn())}
                className={actionClass}
              >
                <Reply size={14} />
                Reply
              </button>
              {thread.canDelete && (
                <button type="button" aria-label="Delete comment" title="Delete" onClick={() => actions.remove(thread.id)} className={actionClass}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </>
        )}
        {replying && (
          <div className="mt-1.5">
            <Composer
              placeholder={`Reply to ${thread.name}`}
              autoFocus
              onPost={(text) => actions.post(text, depth < MAX_DEPTH ? thread.id : thread.parentId)}
              onCancel={() => setReplying(false)}
            />
          </div>
        )}
        {thread.replies.length > 0 && (
          <ul className="-ml-3">
            {thread.replies.map((reply) => (
              <CommentThread key={reply.id} thread={reply} depth={depth + 1} actions={actions} />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

export function CommentsPanel({ pin, getToken, onSignIn, onClose, onCountChange }: CommentsPanelProps) {
  const { error } = useToast()
  const [comments, setComments] = useState<PinComment[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  /** The id of the comment the visitor is being asked to confirm deleting. */
  const [deleting, setDeleting] = useState<string | null>(null)
  const address = `/api/comments/${pin.id}`
  const threads = useMemo(() => toThreads(comments ?? []), [comments])
  const total = comments?.filter((comment) => !comment.deleted).length ?? 0

  useEffect(() => onCountChange(total), [total, onCountChange])

  /** Null when the request could not be sent. */
  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      try {
        const token = getToken ? await getToken() : null
        return await fetch(path, { ...init, headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : undefined })
      } catch {
        return null
      }
    },
    [getToken],
  )

  /** Only the answer to the newest request is shown, so a slow older one cannot undo it. */
  const newestLoad = useRef(0)
  const load = useCallback(async () => {
    const turn = ++newestLoad.current
    const response = await request(address)
    const loaded = response?.ok ? ((await response.json()) as PinComment[]) : null
    if (turn !== newestLoad.current) return
    setLoadFailed(loaded === null)
    if (loaded) setComments(loaded)
  }, [request, address])

  useEffect(() => void load(), [load])

  /** Send a change and show the comments as they are after it. */
  const change = async (path: string, init: RequestInit, failure: string) => {
    const response = await request(path, init)
    await load()
    if (!response?.ok) error(failure, response?.status === 429 ? 'You are posting very fast. Wait a minute and try again.' : 'Please try again.')
    return response?.ok === true
  }

  const actions: Actions = {
    signedIn: getToken !== null,
    onSignIn,
    post: (text, parentId) => change(address, { method: 'POST', body: JSON.stringify({ text, parentId }) }, 'Could not post your comment'),
    vote: (id) => (getToken ? void change(`${address}/${id}/vote`, { method: 'POST' }, 'Could not save your vote') : onSignIn()),
    remove: setDeleting,
  }

  return (
    <div data-testid="comments-panel" className="flex h-full flex-col border-l border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border p-4">
        <IconBadge size="lg" color="var(--color-primary)" iconColor="var(--color-primary-foreground)">
          <MessageCircle size={16} strokeWidth={2.25} />
        </IconBadge>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold leading-tight text-foreground">Comments{total > 0 ? ` · ${total}` : ''}</h2>
          <p className="truncate text-xs text-muted-foreground">{pin.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide comments"
          title="Hide comments"
          className="-mr-2 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelRightClose size={18} />
        </button>
      </header>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {comments && threads.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageCircle size={28} className="text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No comments yet</p>
            <p className="max-w-52 text-xs leading-relaxed text-muted-foreground">Found something here? A tip, a code, a better route? Be the first to share it.</p>
          </div>
        )}
        {loadFailed && (
          <p className="flex items-center justify-between gap-2 pt-3 text-sm text-muted-foreground">
            Could not load the comments.
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </p>
        )}
        <ul>
          {threads.map((thread) => (
            <CommentThread key={thread.id} thread={thread} depth={0} actions={actions} />
          ))}
        </ul>
      </div>

      <footer className="border-t border-border p-3">
        {getToken ? (
          <Composer placeholder="Share a tip about this place" onPost={(text) => actions.post(text, '')} />
        ) : (
          <Button data-testid="comment-sign-in" variant="secondary" className="w-full" onClick={onSignIn}>
            Sign in to comment
          </Button>
        )}
      </footer>

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          setDeleting(null)
          void change(`${address}/${deleting}`, { method: 'DELETE' }, 'Could not delete the comment')
        }}
        title="Delete this comment?"
        description="It will be removed for everyone. Replies to it stay."
        confirmText="Delete"
      />
    </div>
  )
}
