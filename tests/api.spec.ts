import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('unused scaffold routes are gone', async ({ request }) => {
    for (const path of ['/api/integrations', '/api/files/list', '/api/actions/anything']) {
      expect((await request.get(path)).status(), path).toBe(404)
    }
  })

  test('the anonymous counter takes known events only, and the dashboard data needs an admin', async ({ request }) => {
    expect((await request.post('/api/count/visits')).status()).toBe(204)
    expect((await request.post('/api/count/anything')).status()).toBe(404)
    expect((await request.get('/api/admin/stats')).status()).toBe(401)
    expect((await request.post('/api/admin/reports/x', { data: { resolved: true } })).status()).toBe(401)
  })
})
