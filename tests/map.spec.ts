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

test('the map draws its pins', async ({ page }) => {
  await openMap(page)
  await expect.poll(async () => Number(await page.getByTestId('map-canvas').getAttribute('data-pins-drawn')), { timeout: 20_000 }).toBeGreaterThan(50)
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
