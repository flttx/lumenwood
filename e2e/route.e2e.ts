import { expect, test } from '@playwright/test'
import { enterForest, hold, setView, snapshot, teleport } from './helpers'
import { glowFlowers } from '../src/game/world/zones/campLayout'
import { lanterns } from '../src/game/features/route/routeLayout'
test.beforeEach(async ({ page }) => { await enterForest(page); await setView(page, 0, 0.28) })

test('camp route: flowers give fireflies, lanterns light, the north corridor opens', async ({ page }) => {
  test.setTimeout(60_000)
  // Before the route the mist gate holds: walking north (yaw 0 → +Z is S) stops at the camp edge.
  await teleport(page, -3.3, 20.5); await hold(page, 'KeyS', 1200)
  expect((await snapshot(page)).position[1]).toBeLessThanOrEqual(22.001)
  // Wake every camp flower once: each frees one guide firefly.
  for (const [i, f] of glowFlowers.entries()) {
    // Approach from the south: flower 2 sits 2 m from the first lantern, which would take the fireflies at once.
    await teleport(page, f.x, f.z - 0.8)
    await expect.poll(async () => (await snapshot(page)).route.carried, { timeout: 10_000 }).toBe(i + 1)
    await teleport(page, 0, -20) // step away (no flower or lantern within reach) before the next one
  }
  await expect.poll(async () => (await snapshot(page)).route.following).toBe(glowFlowers.length)
  // Light the three lanterns by standing 1 m from each post.
  for (const [i, l] of lanterns.entries()) {
    await teleport(page, l.x - 1, l.z)
    await expect.poll(async () => (await snapshot(page)).route.lit).toBe(i + 1)
  }
  expect((await snapshot(page)).route.carried).toBe(0)
  await expect.poll(async () => (await snapshot(page)).route.northGate, { timeout: 10_000 }).toBe(true)
  await teleport(page, -3.3, 20.5); await hold(page, 'KeyS', 1500)
  expect((await snapshot(page)).position[1]).toBeGreaterThan(24) // into the corridor
})

test('a lantern does not light without enough fireflies', async ({ page }) => {
  await teleport(page, lanterns[0].x - 1, lanterns[0].z); await page.waitForTimeout(500)
  const s = await snapshot(page)
  expect(s.route.lit).toBe(0); expect(s.route.northGate).toBe(false)
})
