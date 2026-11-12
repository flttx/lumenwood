import { expect, test } from '@playwright/test'
import { enterForest, hold, setView, snapshot, teleport } from './helpers'
import { flowers } from '../src/game/world/zones/floraLayout'
import { lanterns } from '../src/game/features/route/routeLayout'
import { GLADE_CENTRE } from '../src/game/world/zones/wetlandLayout'
import { PLATEAU_HEIGHT, highlandPath } from '../src/game/world/zones/highlandLayout'
import { ASCENT, GLADE } from '../src/game/world/regions'
const rampX = (ASCENT.minX + ASCENT.maxX) / 2, plateau = highlandPath[highlandPath.length - 2]
test.beforeEach(async ({ page }) => { await enterForest(page); await setView(page, 0, 0.28) })

test('the ramp to the highlands opens only after the glade finale', async ({ page }) => {
  await teleport(page, rampX, GLADE.maxZ - 2); await hold(page, 'KeyS', 1200) // yaw 0: S walks north
  expect((await snapshot(page)).position[1]).toBeLessThanOrEqual(GLADE.maxZ + 0.001)
  await teleport(page, GLADE_CENTRE[0], GLADE_CENTRE[1])
  await expect.poll(async () => (await snapshot(page)).route.finale).toBe(true)
  await expect.poll(async () => (await snapshot(page)).route.ascent, { timeout: 10_000 }).toBe(true)
  await teleport(page, rampX, GLADE.maxZ - 2); await hold(page, 'KeyS', 2500)
  const s = await snapshot(page)
  expect(s.position[1]).toBeGreaterThan(GLADE.maxZ + 4); expect(s.height).toBeGreaterThan(0.2) // climbing the ramp
})

test('highland route: three cradles light the tree, the ending card appears, and play continues', async ({ page }) => {
  test.setTimeout(90_000)
  for (const [i, f] of flowers.filter(f => f.zone === 'highland').entries()) {
    await teleport(page, f.x, f.z - 0.8)
    await expect.poll(async () => (await snapshot(page)).route.carried, { timeout: 10_000 }).toBe(i + 1)
    await teleport(page, plateau[0], plateau[1])
  }
  await expect.poll(async () => Math.abs((await snapshot(page)).height - PLATEAU_HEIGHT)).toBeLessThan(1.6)
  for (const [n, l] of lanterns.filter(l => l.zone === 'highland').entries()) {
    await teleport(page, l.x - 1.2, l.z)
    await expect.poll(async () => (await snapshot(page)).route.lit).toBe(n + 1)
  }
  await expect.poll(async () => (await snapshot(page)).route.highland).toBe(true)
  expect((await snapshot(page)).music).toBe(7) // every voice at the ending
  await expect(page.getByRole('heading', { name: '森林被点亮了' })).toBeVisible({ timeout: 25_000 })
  await page.getByRole('button', { name: /继续探索/ }).click()
  await expect(page.getByRole('heading', { name: '森林被点亮了' })).toBeHidden()
  expect((await snapshot(page)).phase).toBe('playing')
})

test('first-time guidance caption, and the journey is saved and continued after a reload', async ({ page }) => {
  await expect(page.getByRole('status')).toHaveText(/靠近发光的花朵/, { timeout: 8_000 })
  const f = flowers[0]
  await teleport(page, f.x, f.z - 0.8)
  await expect.poll(async () => (await snapshot(page)).route.carried, { timeout: 10_000 }).toBe(1)
  await teleport(page, 5, -8); await page.waitForTimeout(6_000) // progress saves at once; position within 5 s
  await page.reload()
  await expect(page.getByRole('button', { name: /继续旅程/ })).toBeVisible()
  await page.getByRole('button', { name: /继续旅程/ }).click()
  await page.waitForFunction(() => window.__lumenwood?.snapshot().phase === 'playing')
  const s = await snapshot(page)
  expect(s.route.carried).toBe(1)
  expect(s.position[0]).toBeCloseTo(5, 0); expect(s.position[1]).toBeCloseTo(-8, 0)
  // A new journey clears the save.
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '返回标题' }).click()
  await page.getByRole('button', { name: '新的旅程' }).click()
  await page.waitForFunction(() => window.__lumenwood?.snapshot().phase === 'playing')
  expect((await snapshot(page)).route.carried).toBe(0)
})
