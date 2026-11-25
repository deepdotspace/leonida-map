/** A pin's Instagram reels, one at a time, played through Instagram's embed. */

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { count } from '@/lib/count'
import type { Reel } from './reels'

const stepClass =
  'flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-40'

export function ReelPage({ reels }: { reels: Reel[] }) {
  const [index, setIndex] = useState(0)
  const reel = reels[index]
  const address = `https://www.instagram.com/reel/${reel.code}/`

  useEffect(() => count('reelViews'), [reel.code])

  return (
    <>
      <p className="hidden pr-6 text-xs font-medium text-muted-foreground lg:block">{reels.length === 1 ? 'Instagram reel' : `Instagram reels · ${index + 1} of ${reels.length}`}</p>
      <iframe
        key={reel.code}
        src={`${address}embed/`}
        title={`Instagram reel by ${reel.by}`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="h-[min(420px,calc(100dvh-330px))] lg:h-[min(480px,calc(100dvh-330px))] w-full rounded-lg border-0 bg-white"
      />
      <div className="flex items-center justify-between gap-3">
        <a
          href={address}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <span className="truncate">@{reel.by}</span>
          <ExternalLink size={14} className="shrink-0" />
        </a>
        {reels.length > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" aria-label="Previous reel" disabled={index === 0} onClick={() => setIndex(index - 1)} className={stepClass}>
              <ChevronLeft size={16} />
            </button>
            <span data-testid="reel-position" className="text-xs tabular-nums text-muted-foreground lg:hidden">
              {index + 1} of {reels.length}
            </span>
            <button
              type="button"
              data-testid="reel-next"
              aria-label="Next reel"
              disabled={index === reels.length - 1}
              onClick={() => setIndex(index + 1)}
              className={stepClass}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
