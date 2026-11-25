/**
 * Root shell — wraps every route.
 *
 * It deliberately mounts no DeepSpace providers, so every page is a plain
 * static page: no auth session fetch, no records WebSocket. The account code
 * (src/account) brings its own providers and is loaded only when needed.
 *
 * ToastProvider is local UI state (src/components/ui), not a network surface,
 * so it is safe to mount here for every page.
 */

import { Suspense } from 'react'
import { Outlet, useRouteError } from 'react-router-dom'
import { ErrorScreen } from '../components/ErrorScreen'
import { ToastProvider } from '@/components/ui'

export default function App() {
  return (
    <ToastProvider>
      {/* data-testid="app-root" is what the browser tests wait for on every page. */}
      <div data-testid="app-root" className="min-h-screen bg-background text-foreground">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>}>
          <Outlet />
        </Suspense>
      </div>
    </ToastProvider>
  )
}

/**
 * Root error boundary. Generouted wires a `_app` `Catch` export to the root
 * route's errorElement, so any render-time crash in a page — a thrown error,
 * or a hooks-rule violation like React #310 — lands here instead of React
 * Router's raw minified screen. ErrorScreen decodes the error for the developer.
 */
export function Catch() {
  const error = useRouteError()
  return <ErrorScreen error={error} />
}

/** Root fallback shown while Generouted loads the first lazy route module. */
export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  )
}
