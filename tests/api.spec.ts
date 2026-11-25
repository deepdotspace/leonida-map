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
})
