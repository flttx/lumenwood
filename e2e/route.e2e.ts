import { expect, test } from '@playwright/test'
import { enterForest, hold, setView, snapshot, teleport } from './helpers'
import { glowFlowers } from '../src/game/world/zones/campLayout'
import { lanterns } from '../src/game/features/route/routeLayout'
import { CAMP, NORTH_CORRIDOR } from '../src/game/world/regions'
const corridorX = (NORTH_CORRIDOR.minX + NORTH_CORRIDOR.maxX) / 2
test.beforeEach(async ({ page }) => { await enterForest(page); await setView(page, 0, 0.28) })

test('camp route: flowers give fireflies, lanterns light, the north corridor opens', async ({ page }) => {
  test.setTimeout(60_000)
  // Before the route the mist gate holds: walking north (yaw 0 → +Z is S) stops at the camp edge.
  await teleport(page, corridorX, CAMP.maxZ - 1.5); await hold(page, 'KeyS', 1200)
  expect((await snapshot(page)).position[1]).toBeLessThanOrEqual(CAMP.maxZ + 0.001)
  // Wake every camp flower once: each frees one guide firefly.
  for (const [i, f] of glowFlowers.entries()) {
    // Approach from the south, staying outside nearby lantern interaction ranges.
    await teleport(page, f.x, f.z - 0.8)
    await expect.poll(async () => (await snapshot(page)).route.carried, { timeout: 10_000 }).toBe(i + 1)
    await teleport(page, 0, 0) // back to the spawn clearing (no flower or lantern within reach) before the next one
  }
  await expect.poll(async () => (await snapshot(page)).route.following).toBe(glowFlowers.length)
  // Light the three lanterns by standing 1 m from each post.
  for (const [i, l] of lanterns.filter(l => l.zone === 'camp').entries()) {
    await teleport(page, l.x + (l.x > 0 ? -1 : 1), l.z)
    await expect.poll(async () => (await snapshot(page)).route.lit).toBe(i + 1)
  }
  expect((await snapshot(page)).route.carried).toBe(0)
  await expect.poll(async () => (await snapshot(page)).route.northGate, { timeout: 10_000 }).toBe(true)
  await teleport(page, corridorX, CAMP.maxZ - 1.5); await hold(page, 'KeyS', 1500)
  expect((await snapshot(page)).position[1]).toBeGreaterThan(CAMP.maxZ + 2) // into the corridor
})

test('a lantern does not light without enough fireflies', async ({ page }) => {
  await teleport(page, lanterns[0].x - 1, lanterns[0].z); await page.waitForTimeout(500)
  const s = await snapshot(page)
  expect(s.route.lit).toBe(0); expect(s.route.northGate).toBe(false)
})

test('a new player can reach the first two flowers and light the first lantern on foot', async ({ page }) => {
  test.setTimeout(45_000)
  await page.waitForSelector('.loading-veil.done')
  const walkTo = async (x: number, z: number, reach: number) => {
    for (let step = 0; step < 80; step++) {
      const s = await snapshot(page), dx = x - s.position[0], dz = z - s.position[1]
      if (Math.hypot(dx, dz) < reach) break
      await setView(page, Math.atan2(-dx, -dz), 0.28)
      await hold(page, 'KeyW', 180)
    }
    await expect.poll(async () => { const s = await snapshot(page); return Math.hypot(x - s.position[0], z - s.position[1]) }).toBeLessThan(reach + 0.3)
  }
  await walkTo(glowFlowers[0].x, glowFlowers[0].z, 1.3)
  await expect.poll(async () => (await snapshot(page)).route.carried).toBe(1)
  await walkTo(glowFlowers[1].x, glowFlowers[1].z, 1.3)
  await expect.poll(async () => (await snapshot(page)).route.carried).toBe(2)
  await walkTo(lanterns[0].x, lanterns[0].z, 1.7)
  await expect.poll(async () => (await snapshot(page)).route.lit).toBe(1)
})

test('the next action stays visible, turns with the camera, and follows flower and lantern progress', async ({ page }) => {
  // This case covers the established firefly chapter after completing the separate daytime introduction.
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('lumenwood-save-v1'))).toBe(true)
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('lumenwood-save-v1')!)
    raw.sunlight = { steps: [2, 0], grown: true, crossed: true }
    localStorage.setItem('lumenwood-save-v1', JSON.stringify(raw))
  })
  await page.reload(); await page.getByRole('button', { name: /继续旅程/ }).click()
  await page.waitForFunction(() => window.__lumenwood?.snapshot().phase === 'playing')
  await setView(page, 0, 0.28)
  const objective = page.getByRole('region', { name: '当前目标' })
  await expect(objective).toContainText('再唤醒 2 朵花')
  await expect(objective).toContainText('目标在右侧')
  await setView(page, Math.PI, 0.28)
  await expect(objective).toContainText('目标在左侧')
  await page.waitForTimeout(8_000) // instructions must survive the one-shot caption and region banner
  await expect(objective).toBeVisible()
  await teleport(page, glowFlowers[0].x, glowFlowers[0].z)
  await expect(objective).toContainText('再唤醒 1 朵花')
  await teleport(page, glowFlowers[1].x, glowFlowers[1].z)
  await expect(objective).toContainText('带着萤火，靠近未亮的灯笼')
  const l = lanterns[0]
  await teleport(page, l.x + 1, l.z)
  await expect(objective).toContainText('灯火 1/3')
  await expect(objective).toContainText('再唤醒 2 朵花')
})


test('restored wetland progress shows the remaining lantern and opens the bridge', async ({ page }) => {
  await page.evaluate(() => {
    const save = { v: 2, released: Array.from({ length: 12 }, (_, i) => i), lit: [true, true, true, true, true, false, false, false, false], completed: ['camp'], finale: false, captions: [], ending: false, position: [0, 0], seeds: [], secrets: [] }
    localStorage.setItem('lumenwood-save-v1', JSON.stringify(save))
  })
  await page.reload()
  await page.getByRole('button', { name: /继续旅程/ }).click()
  await page.waitForFunction(() => window.__lumenwood?.snapshot().phase === 'playing')
  const wetland = lanterns.filter(l => l.zone === 'wetland')
  await teleport(page, wetland[1].x + 1, wetland[1].z)
  await expect(page.getByText('湿地灯火 2/3 · 点亮全部开启光桥')).toBeVisible({ timeout: 10_000 })
  await teleport(page, wetland[2].x + 1, wetland[2].z)
  await expect.poll(async () => (await snapshot(page)).route.lit).toBe(6)
  await expect.poll(async () => (await snapshot(page)).route.bridge, { timeout: 10_000 }).toBe(true)
})
