/**
 * Details of one pin: category, name, description, labelled values, credit
 * and links, plus what the visitor can do with it (tick it as found, star it,
 * keep a private note, step through its category, report a problem).
 *
 * A pin with reels opens like a notebook: details on the left page, the reels
 * on the right. Narrow screens show one page at a time.
 */

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clapperboard, ExternalLink, Flag, Link2, NotebookPen, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { categoryIcon } from './category-icons'
import { IconBadge } from './IconBadge'
import { readableOn } from './pin-images'
import { categoryById, parseDescription, pinNumberInCategory, pinsByCategory, type Pin } from './pins'
import { foundCount, nextUnfound } from './progress'
import { reelsByPin } from './reels'
import { ReelPage } from './ReelPage'
import { setFavourite, setFound, setNote, type UserData } from './user-data'

/** Pin links are written relative to the site the entry came from. */
const LINK_BASE = 'https://www.gtabase.com'

function detailsLink(url: string) {
  const { href, hostname } = new URL(url, LINK_BASE)
  return { href, site: hostname === 'gta.wiki' ? 'GTA Wiki' : 'GTA Base' }
}

const footerLinkClass = 'inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
const iconButtonClass =
  'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
const stepButtonClass =
  'flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  const Icon = copied ? Check : Link2
  return (
    <button type="button" onClick={copy} className={footerLinkClass}>
      <Icon size={14} />
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

interface PinCardProps {
  pin: Pin
  userData: UserData
  /** Open another pin and move the map to it. */
  onGoTo: (pin: Pin) => void
  onReport: (pin: Pin) => void
}

export function PinCard({ pin, userData, onGoTo, onReport }: PinCardProps) {
  const category = categoryById.get(pin.category)!
  const Icon = categoryIcon(category)
  const { prose, fields } = parseDescription(pin.description)
  const link = pin.url ? detailsLink(pin.url) : null
  const credit = pin.foundBy ? `Found by ${pin.foundBy}` : pin.addedBy ? `Added by ${pin.addedBy}` : null
  const source = pin.category === 'instagram-find' ? 'on Instagram' : 'via GTA Base'

  const siblings = pinsByCategory.get(pin.category)!
  const index = pinNumberInCategory.get(pin.id)! - 1
  const found = userData.found.has(pin.id)
  const favourite = userData.favourites.has(pin.id)
  const savedNote = userData.notes.get(pin.id) ?? ''
  const [note, setNoteDraft] = useState(savedNote)
  const [noteOpen, setNoteOpen] = useState(savedNote !== '')
  const foundInCategory = foundCount(pin.category, userData.found)
  const next = nextUnfound(pin.category, userData.found, pin)
  const reels = reelsByPin.get(pin.id)
  const [narrowPage, setNarrowPage] = useState<'details' | 'reels'>('details')

  return (
    <div className="flex text-left lg:gap-4">
      <article
        data-testid="pin-card"
        className={cn('min-w-0 flex-col gap-3', reels && 'lg:w-[306px] lg:shrink-0', narrowPage === 'details' ? 'flex' : 'hidden lg:flex')}
      >
        <header className="flex items-start gap-3 pr-6">
          <IconBadge size="lg" color={category.color} iconColor={readableOn(category.color)} className="mt-0.5">
            <Icon size={16} strokeWidth={2.25} />
          </IconBadge>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{category.name}</p>
            <h2 className="text-base font-semibold leading-snug text-foreground">{pin.name}</h2>
          </div>
        </header>

        {prose && <p className="text-sm leading-relaxed text-foreground/90">{prose}</p>}

        {fields.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-muted px-3 py-2.5 text-sm">
            {fields.map((field) => (
              <div key={field.label} className="contents">
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="font-medium text-foreground">{field.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {credit && (
          <p className="text-xs text-muted-foreground">
            {credit} · {source}
          </p>
        )}

        {reels && (
          <button
            type="button"
            data-testid="pin-reels"
            onClick={() => setNarrowPage('reels')}
            className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary/15 text-sm font-medium text-primary transition-colors hover:bg-primary/25 lg:hidden"
          >
            <Clapperboard size={16} />
            {reels.length === 1 ? 'Watch the reel' : `Watch ${reels.length} reels`}
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="pin-found"
            aria-pressed={found}
            onClick={() => setFound([pin.id], !found)}
            className={cn(
              'flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors',
              found ? 'border-success/40 bg-success/15 text-success hover:bg-success/25' : 'border-border text-foreground hover:bg-accent',
            )}
          >
            <Check size={16} />
            {found ? 'Found' : 'Mark as found'}
          </button>
          <button
            type="button"
            data-testid="pin-favourite"
            aria-pressed={favourite}
            aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
            title={favourite ? 'Remove from favourites' : 'Add to favourites'}
            onClick={() => setFavourite(pin.id, !favourite)}
            className={cn(iconButtonClass, favourite && 'border-warning/40 bg-warning/15 text-warning hover:text-warning')}
          >
            <Star size={16} fill={favourite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            data-testid="pin-note-toggle"
            aria-expanded={noteOpen}
            aria-label="Private note"
            title="Private note"
            onClick={() => setNoteOpen(!noteOpen)}
            className={cn(iconButtonClass, savedNote && 'border-primary/40 bg-primary/15 text-primary hover:text-primary')}
          >
            <NotebookPen size={16} />
          </button>
        </div>

        {noteOpen && (
          <textarea
            data-testid="pin-note"
            value={note}
            onChange={(event) => {
              setNoteDraft(event.target.value)
              setNote(pin.id, event.target.value)
            }}
            maxLength={1000}
            rows={2}
            placeholder="Your note. Only you see it."
            aria-label="Private note"
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Previous ${category.name}`}
              title="Previous"
              onClick={() => onGoTo(siblings[(index - 1 + siblings.length) % siblings.length])}
              className={stepButtonClass}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="tabular-nums">
              {index + 1} of {siblings.length}
              {foundInCategory > 0 && ` · ${foundInCategory} found`}
            </span>
            <button
              type="button"
              data-testid="pin-next"
              aria-label={`Next ${category.name}`}
              title="Next"
              onClick={() => onGoTo(siblings[(index + 1) % siblings.length])}
              className={stepButtonClass}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {foundInCategory > 0 && next && (
            <button
              type="button"
              data-testid="pin-next-unfound"
              onClick={() => onGoTo(next)}
              className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline"
            >
              Next unfound
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <div className="flex items-center gap-4">
            <CopyLinkButton />
            <button type="button" data-testid="pin-report" onClick={() => onReport(pin)} className={footerLinkClass}>
              <Flag size={14} />
              Report
            </button>
          </div>
          {link && (
            <a href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              {link.site}
              <ExternalLink size={14} />
            </a>
          )}
        </footer>
      </article>
      {reels && (
        <section
          data-testid="reel-page"
          aria-label={`Reels about ${pin.name}`}
          className={cn('w-[326px] max-w-full flex-col gap-3 lg:border-l lg:border-border lg:pl-4', narrowPage === 'reels' ? 'flex' : 'hidden lg:flex')}
        >
          <button type="button" onClick={() => setNarrowPage('details')} className={cn(footerLinkClass, 'self-start lg:hidden')}>
            <ArrowLeft size={14} />
            {pin.name}
          </button>
          <ReelPage reels={reels} />
        </section>
      )}
    </div>
  )
}
