/**
 * The one WebSocket route: the app's record room, which holds signed-in
 * visitors' saved map data and the problem reports.
 *
 * Caller identity in query parameters and headers is never trusted. The route
 * verifies the JWT, scrubs caller-supplied identity and forwards the verified
 * identity in internal-only headers. A connection without a token is anonymous.
 */

import type { Hono } from 'hono'
import { authenticatedRoomRequest, verifyJwt } from 'deepspace/worker'
import type { VerifyResult } from 'deepspace/worker'
import type { AppContext } from '../../worker.js'

export function registerRealtimeRoutes(app: Hono<AppContext>): void {
  app.get('/ws/:roomId', async (c) => {
    const roomId = `app:${c.env.DEEPSPACE_APP_ID}`
    if (c.req.param('roomId') !== roomId) return new Response('Not found', { status: 404 })

    const token = new URL(c.req.url).searchParams.get('token')
    let auth: VerifyResult | null = null
    if (token) {
      auth = (await verifyJwt({ publicKey: c.env.AUTH_JWT_PUBLIC_KEY, issuer: c.env.AUTH_JWT_ISSUER }, token)).result
      if (!auth) return new Response('Unauthorized', { status: 401 })
    }

    const stub = c.env.RECORD_ROOMS.get(c.env.RECORD_ROOMS.idFromName(roomId))
    return stub.fetch(authenticatedRoomRequest(c.req.raw, auth))
  })
}
