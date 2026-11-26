/**
 * The map's saved data: it is kept in the browser without an account, and a
 * signed-in visitor gets it on every browser they sign in on.
 */
import { test, expect, loadAllTestAccounts, newSignedInContext } from 'deepspace/testing'

const PIN_URL = '/?pin=bank-001'

type Page = import('@playwright/test').Page

/**
 * The deployed page arrives as ready-made HTML and only reacts to clicks once
 * its script has loaded. The map canvas is drawn by that script, so waiting
 * for it means the page is ready to use.
 */
async function ready(page: Page) {
  await page.getByTestId('map-canvas').waitFor({ timeout: 20_000 })
}

async function openMap(page: Page, url = '/') {
  await page.goto(url)
  await ready(page)
}

test('a visitor without an account keeps what they save after a reload', async ({ page }) => {
  await openMap(page, PIN_URL)
  await page.getByTestId('pin-found').click()
  await page.getByTestId('pin-favourite').click()
  await expect(page.getByTestId('my-map')).toContainText('1 found')

  await page.reload()
  await ready(page)
  await expect(page.getByTestId('pin-found')).toHaveText('Found')
  await expect(page.getByTestId('my-map')).toContainText('1 saved')
})

test('the DeepSpace credit can be dismissed and is back on the next visit', async ({ page }) => {
  await openMap(page)
  await page.getByTestId('made-with-dismiss').click()
  await expect(page.getByTestId('made-with-deepspace')).toHaveCount(0)
  await openMap(page)
  await expect(page.getByTestId('made-with-deepspace')).toBeVisible()
})

test('the map draws its pins', async ({ page }) => {
  await openMap(page)
  await expect.poll(async () => Number(await page.getByTestId('map-canvas').getAttribute('data-pins-drawn')), { timeout: 20_000 }).toBeGreaterThan(50)
})

test('a place that takes several steps shows how to do it', async ({ page }) => {
  await openMap(page, '/?pin=unique-weapon-012')
  const guide = page.getByTestId('pin-guide')
  await expect(guide).toContainText('How to do it')
  expect(await guide.getByRole('listitem').count()).toBeGreaterThan(2)
})

test('a place list opens the map showing only that kind of place', async ({ page }) => {
  await page.goto('/locations/bank')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Banks locations in GTA 6')
  await page.getByRole('link', { name: /Show all/ }).click()
  await expect(page.getByTestId('shown-pin-count')).toContainText('Showing 22 of')
})

test.describe('signed in', () => {
  const accounts = loadAllTestAccounts()
  test.skip(accounts.length < 1, 'Needs a usable test account: `npx deepspace test accounts create`.')

  test('what is saved on one browser appears on another', async ({ browser, baseURL }) => {
    const note = `note ${Date.now()}`
    const open = async () => {
      const context = await newSignedInContext(browser, accounts[0], baseURL!)
      const page = await context.newPage()
      await openMap(page, PIN_URL)
      await page.getByTestId('map-sign-in').click()
      await expect(page.getByTestId('map-account')).toBeVisible({ timeout: 15_000 })
      return page
    }

    const first = await open()
    await first.getByTestId('pin-note-toggle').click()
    await first.getByTestId('pin-note').fill(note)
    await first.getByTestId('pin-note').blur()

    const second = await open()
    await expect(second.getByTestId('my-map')).toContainText('saved', { timeout: 15_000 })
    await second.getByTestId('my-map').click()
    await expect(second.getByTestId('my-map-view')).toContainText(note)
  })

  test('a signed-in visitor comments, replies and upvotes; anyone reads the thread; the author deletes it', async ({ browser, baseURL, page }) => {
    const text = `tip ${Date.now()}`
    const context = await newSignedInContext(browser, accounts[0], baseURL!)
    const author = await context.newPage()
    await openMap(author, PIN_URL)
    await author.getByTestId('pin-comments').click()
    await author.getByTestId('comment-sign-in').click()
    await author.getByTestId('comment-draft').fill(text)
    await author.getByTestId('comment-post').click()
    const posted = author.getByTestId('comment').filter({ hasText: text })
    await expect(posted).toBeVisible()

    await posted.getByTestId('comment-reply').click()
    await posted.getByTestId('comment-draft').fill(`re ${text}`)
    await posted.getByTestId('comment-post').click()
    const reply = posted.getByTestId('comment').filter({ hasText: `re ${text}` })
    await expect(reply).toBeVisible()
    await posted.getByTestId('comment-upvote').first().click()
    await expect(posted.getByTestId('comment-upvote').first()).toHaveText('1')

    await openMap(page, PIN_URL)
    await expect(page.getByTestId('pin-comments')).toContainText('comment')
    await expect(page.getByTestId('comments-panel')).not.toBeInViewport()
    await page.getByTestId('pin-comments').click()
    const read = page.getByTestId('comment').filter({ hasText: text }).first()
    await expect(read.getByTestId('comment').filter({ hasText: `re ${text}` })).toBeVisible()
    await expect(read.getByTestId('comment-upvote').first()).toHaveText('1')
    await expect(page.getByTestId('comment-sign-in')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete comment' })).toHaveCount(0)

    const confirmDelete = author.getByRole('dialog').getByRole('button', { name: 'Delete' })
    await posted.getByRole('button', { name: 'Delete comment' }).first().click()
    await confirmDelete.click()
    await expect(posted.getByText('Comment deleted')).toBeVisible()
    await reply.getByRole('button', { name: 'Delete comment' }).click()
    await confirmDelete.click()
    await expect(author.getByTestId('comment').filter({ hasText: text })).toHaveCount(0)
    const left: Array<{ at: string }> = await (await author.request.get('/api/comments/bank-001')).json()
    expect(left.filter((comment) => Date.now() - new Date(comment.at).getTime() < 60_000)).toEqual([])
  })
})

test('a category opens as a list in the sidebar and a row opens the place', async ({ page }) => {
  await openMap(page)
  await page.getByTestId('tree-group-robberies').getByRole('button').first().click()
  await page.getByTestId('tree-item-open-bank').click()
  const list = page.getByTestId('place-list')
  await expect(list).toContainText('22 places')
  const shownBefore = await page.getByTestId('shown-pin-count').textContent()
  await list.getByTestId('only-these').click()
  await list.getByRole('listitem').first().click()
  await expect(page.getByTestId('pin-card')).toBeVisible()
  await page.getByTestId('sidebar-back').click()
  await expect(page.getByTestId('shown-pin-count')).toContainText('Showing 22 of')
  await page.getByTestId('clear-only').click()
  await expect(page.getByTestId('shown-pin-count')).toHaveText(shownBefore!)
})

test('Must see lists hand-picked places and can be the only thing on the map', async ({ page }) => {
  await openMap(page)
  await page.getByTestId('must-see').click()
  await expect(page.getByTestId('place-list')).toContainText('Bigfoot')
  await page.getByTestId('only-these').click()
  await page.getByTestId('sidebar-back').click()
  await expect(page.getByTestId('shown-pin-count')).toContainText('Showing 42 of')
  await page.getByTestId('clear-only').click()
  await expect(page.getByTestId('shown-pin-count')).not.toContainText('Showing 42 of')
})

test('the sidebar edge drags to a new width that survives a reload, and the sidebar slides shut', async ({ page }) => {
  await openMap(page)
  const sidebar = page.locator('aside')
  await page.getByTestId('sidebar-resize').hover()
  await page.mouse.down()
  await page.mouse.move(450, 300, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(450)
  await page.reload()
  await ready(page)
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(450)
  await page.getByRole('button', { name: 'Hide sidebar' }).click()
  await expect.poll(async () => (await sidebar.boundingBox())?.x).toBe(-450)
  await page.getByRole('button', { name: 'Filters' }).click()
  await expect.poll(async () => (await sidebar.boundingBox())?.x).toBe(0)
})

test('the comments panel drags to a new width and hides', async ({ page }) => {
  await openMap(page, PIN_URL)
  const panel = page.getByTestId('comments-panel')
  await page.getByTestId('pin-comments').click()
  await page.getByTestId('comments-resize').hover()
  await page.mouse.down()
  await page.mouse.move(1280 - 480, 300, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(480)
  await page.getByRole('button', { name: 'Hide comments' }).click()
  await expect.poll(async () => (await panel.boundingBox())?.x).toBe(1280)
  await page.getByTestId('pin-comments').click()
  await expect.poll(async () => (await panel.boundingBox())?.x).toBe(800)
})
