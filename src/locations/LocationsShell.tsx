import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Page frame shared by the location list pages: a way back to the map, a heading and the credit line. */
export function LocationsShell({ back, title, intro, children }: { back: { to: string; label: string }; title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
        <Link to={back.to} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          {back.label}
        </Link>
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{intro}</p>
        </header>
        {children}
        <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Landmark data from{' '}
          <a href="https://map.gtadb.org" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            GTADB
          </a>{' '}
          (CC BY 4.0) and GTA Base contributors. Fan-made, not affiliated with Rockstar Games.
        </p>
      </div>
    </div>
  )
}
