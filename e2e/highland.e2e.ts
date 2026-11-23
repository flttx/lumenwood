import { expect, test } from '@playwright/test'
import { enterForest, hold, setView, snapshot, teleport } from './helpers'
import { flowers } from '../src/game/world/zones/floraLayout'
import { lanterns } from '../src/game/features/route/routeLayout'
import { GLADE_CENTRE } from '../src/game/world/zones/wetlandLayout'
import { ANCIENT_TREE, PLATEAU_HEIGHT, highlandPath } from '../src/game/world/zones/highlandLayout'
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
  const cradles = lanterns.filter(l => l.zone === 'highland')
  const faceTree = async (x: number, z: number, away = false) => { await setView(page, Math.atan2(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]) + (away ? Math.PI : 0), 0.28); await page.waitForTimeout(100) }
  await teleport(page, cradles[1].x - 1.2, cradles[1].z)
  await faceTree(cradles[1].x - 1.2, cradles[1].z); await hold(page, 'KeyE', 1700)
  expect((await snapshot(page)).route.lit).toBe(0) // cannot skip the root conduit
  for (const [n, l] of cradles.entries()) {
    await teleport(page, l.x - 1.2, l.z)
    await page.waitForTimeout(300); expect((await snapshot(page)).route.lit).toBe(n) // proximity alone never spends followers
    if (n === 0) {
      await faceTree(l.x - 1.2, l.z, true); await hold(page, 'KeyE', 1700)
      expect((await snapshot(page)).route.lit).toBe(0)
      await faceTree(l.x - 1.2, l.z)
      await page.keyboard.down('KeyE'); await page.waitForTimeout(450); await page.keyboard.press('Escape'); await page.keyboard.up('KeyE')
      await expect.poll(async () => (await snapshot(page)).phase).toBe('paused')
      const charge = (await snapshot(page)).conduit.charge
      expect(charge).toBeGreaterThan(0); expect(charge).toBeLessThan(1)
      await page.waitForTimeout(800); expect((await snapshot(page)).conduit.charge).toBe(charge)
      await page.getByRole('button', { name: /继续探索/ }).click()
    }
    await faceTree(l.x - 1.2, l.z)
    await page.keyboard.down('KeyE')
    try { await expect.poll(async () => (await snapshot(page)).route.lit, { timeout: 8000 }).toBe(n + 1) }
    finally { await page.keyboard.up('KeyE') }
  }
  await expect.poll(async () => (await snapshot(page)).route.highland).toBe(true)
  expect((await snapshot(page)).music).toBe(7) // every voice at the ending
  await expect(page.getByRole('heading', { name: '森林被点亮了' })).toBeVisible({ timeout: 25_000 })
  await page.getByRole('button', { name: /继续探索/ }).click()
  await expect(page.getByRole('heading', { name: '森林被点亮了' })).toBeHidden()
  expect((await snapshot(page)).phase).toBe('playing')
})

test('first-time guidance caption, and the journey is saved and continued after a reload', async ({ page }) => {
  await expect(page.getByRole('status')).toHaveText(/日光镜/, { timeout: 8_000 })
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
