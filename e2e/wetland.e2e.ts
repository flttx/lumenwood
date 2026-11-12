import { expect, test } from '@playwright/test'
import { enterForest, hold, setView, snapshot, teleport } from './helpers'
import { flowers } from '../src/game/world/zones/floraLayout'
import { lanterns } from '../src/game/features/route/routeLayout'
import { SHALLOW_DEPTH, pools, wetlandPath } from '../src/game/world/zones/wetlandLayout'
import { BRIDGE, GLADE, WETLAND } from '../src/game/world/regions'
const bridgeX = (BRIDGE.minX + BRIDGE.maxX) / 2, entrance = wetlandPath[0]
test.beforeEach(async ({ page }) => { await enterForest(page); await setView(page, 0, 0.28) })

test('wading: the player sinks into shallow pools and splashes while walking', async ({ page }) => {
  const pool = pools.find(p => !p.deep)!
  await teleport(page, pool.x, pool.z)
  await expect.poll(async () => (await snapshot(page)).height).toBeCloseTo(SHALLOW_DEPTH, 2)
  const before = (await snapshot(page)).splashes
  await hold(page, 'KeyA', 900)
  expect((await snapshot(page)).splashes).toBeGreaterThan(before)
  await teleport(page, entrance[0], entrance[1] + 3)
  await expect.poll(async () => (await snapshot(page)).height).toBe(0) // dry trail
})

test('deep water blocks the player', async ({ page }) => {
  const deep = pools.find(p => p.deep)!
  await teleport(page, deep.x - deep.r - 1.5, deep.z); await setView(page, -Math.PI / 2, 0.28) // facing +X, toward the pool
  await hold(page, 'KeyW', 1500)
  const [x, z] = (await snapshot(page)).position
  expect(Math.hypot(x - deep.x, z - deep.z)).toBeGreaterThan(deep.r * 0.9) // stopped at the collider, never waded in deep
  expect((await snapshot(page)).height).toBeGreaterThan(SHALLOW_DEPTH - 0.02)
})

test('wetland route: flowers and lanterns raise the light bridge to the glade, where the finale plays', async ({ page }) => {
  test.setTimeout(60_000)
  // Before the route the channel holds: walking north from the bridge foot stops at the wetland's edge.
  await teleport(page, bridgeX, WETLAND.maxZ - 1); await hold(page, 'KeyS', 1200)
  expect((await snapshot(page)).position[1]).toBeLessThanOrEqual(WETLAND.maxZ + 0.001)
  const wetland = flowers.filter(f => f.zone === 'wetland')
  for (const [i, f] of wetland.entries()) {
    await teleport(page, f.x, f.z - 0.8)
    await expect.poll(async () => (await snapshot(page)).route.carried, { timeout: 10_000 }).toBe(i + 1)
    await teleport(page, entrance[0], entrance[1] + 3) // wetland entrance: no flower or lantern within reach
  }
  for (const [n, l] of lanterns.filter(l => l.zone === 'wetland').entries()) {
    await teleport(page, l.x + (l.x > -10 ? -1 : 1), l.z)
    await expect.poll(async () => (await snapshot(page)).route.lit).toBe(n + 1)
  }
  await expect.poll(async () => (await snapshot(page)).route.bridge, { timeout: 10_000 }).toBe(true)
  expect((await snapshot(page)).route.northGate).toBe(false) // zones are independent
  await teleport(page, bridgeX, WETLAND.maxZ - 1); await hold(page, 'KeyS', 3600)
  const s = await snapshot(page)
  expect(s.position[1]).toBeGreaterThan(GLADE.minZ) // crossed the channel
  expect(s.height).toBe(0) // carried by the bridge, never sank into the deep channel
  await expect.poll(async () => (await snapshot(page)).route.finale).toBe(true)
})
