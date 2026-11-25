/**
 * The owner's dashboard: sign-ups, what accounts have saved, the anonymous
 * daily totals and the problem reports. The numbers come from the worker,
 * which answers only an admin (src/server/stats-routes.ts).
 */

import { useCallback, useEffect, useState } from 'react'
import { DeepSpaceAuthProvider, getAuthToken, useAuthStatus } from 'deepspace'
import { Link } from 'react-router-dom'
import { PIN_PARAM } from '../map/links'
import { pinById } from '../map/pins'
import type { Stats } from '../server/stats-routes'
import NotFound from './[...all]'

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, { ...init, headers: { Authorization: `Bearer ${await getAuthToken()}`, 'Content-Type': 'application/json' } })
}

export default function AdminPage() {
  return (
    <DeepSpaceAuthProvider>
      <title>Dashboard · Leonida Map</title>
      <meta name="robots" content="noindex" />
      <Dashboard />
    </DeepSpaceAuthProvider>
  )
}

function Dashboard() {
  const { isLoaded, isSignedIn } = useAuthStatus()
  const [stats, setStats] = useState<Stats | 'refused' | null>(null)

  const load = useCallback(async () => {
    const response = await adminFetch('/api/admin/stats')
    setStats(response.ok ? await response.json() : 'refused')
  }, [])

  useEffect(() => {
    if (isSignedIn) void load()
  }, [isSignedIn, load])

  if (isLoaded && !isSignedIn) {
    return (
      <Message>
        <Link to="/" className="underline">
          Sign in on the map
        </Link>
        , then open this page again.
      </Message>
    )
  }
  if (stats === 'refused') return <NotFound />
  if (!stats) return <Message>Loading…</Message>

  const setResolved = async (id: string, resolved: boolean) => {
    await adminFetch(`/api/admin/reports/${id}`, { method: 'POST', body: JSON.stringify({ resolved }) })
    await load()
  }
  const open = stats.reports.filter((report) => !report.resolved).length

  return (
    <main data-testid="admin-dashboard" className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to the map
        </Link>
      </header>

      <Section title="Accounts">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="Sign-ups" value={stats.signups} />
          <Tile label="Active in the last 7 days" value={stats.activeThisWeek} />
        </div>
      </Section>

      <Section title="Accounts that saved something">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Found places" value={stats.saved.found ?? 0} />
          <Tile label="Favourites" value={stats.saved.fav ?? 0} />
          <Tile label="Notes" value={stats.saved.note ?? 0} />
          <Tile label="Own markers" value={stats.saved.marker ?? 0} />
        </div>
      </Section>

      <Section title="Last 30 days">
        <table className="w-full text-right text-sm tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1.5 text-left font-medium">Day (UTC)</th>
              <th className="font-medium">Sign-ups</th>
              <th className="font-medium">Visits</th>
              <th className="font-medium">Pins opened</th>
              <th className="font-medium">Reels shown</th>
            </tr>
          </thead>
          <tbody>
            {lastDays(30).map((day) => {
              const counts = stats.countsByDay[day] ?? {}
              return (
                <tr key={day} className="border-t border-border">
                  <td className="py-1.5 text-left">{day}</td>
                  <td>{stats.signupsByDay[day] ?? 0}</td>
                  <td>{Number(counts.visits ?? 0)}</td>
                  <td>{Number(counts.pinOpens ?? 0)}</td>
                  <td>{Number(counts.reelViews ?? 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>

      <Section title={`Problem reports · ${open} open`}>
        {stats.reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
        <ul className="flex flex-col">
          {stats.reports.map((report) => {
            const { pinId, problem, details } = report
            const resolved = Boolean(report.resolved)
            return (
              <li key={report.id} data-testid="admin-report" className="flex items-start gap-3 border-t border-border py-2.5 text-sm">
                <input
                  type="checkbox"
                  aria-label="Resolved"
                  checked={resolved}
                  onChange={(event) => void setResolved(report.id, event.target.checked)}
                  className="mt-1 size-4 cursor-pointer"
                />
                <div className={resolved ? 'min-w-0 flex-1 opacity-50' : 'min-w-0 flex-1'}>
                  <p className="font-medium">
                    {problem} ·{' '}
                    <a href={`/?${PIN_PARAM}=${encodeURIComponent(pinId)}`} className="underline">
                      {pinById.get(pinId)?.name ?? pinId}
                    </a>
                  </p>
                  {details && <p className="text-muted-foreground">{details}</p>}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">{report.at.slice(0, 10)}</time>
              </li>
            )
          })}
        </ul>
      </Section>
    </main>
  )
}

/** The last `count` days as "2026-11-25", newest first. */
function lastDays(count: number): string[] {
  return Array.from({ length: count }, (_, back) => new Date(Date.now() - back * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-muted-foreground">{children}</p>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3">
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('en-US')}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
