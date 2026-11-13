import { expect, test } from '@playwright/test'
import { enterForest, hold, setView, snapshot, teleport } from './helpers'
import { ECHO_ORDER, VISTA_POINT, echoStones, fordStones, giantMushrooms, seeds } from '../src/game/world/zones/sideLayout'
import { CAMP, GLEN_PASS } from '../src/game/world/regions'
// Side areas (third pass, 2026-11-12): open from the start, each with a secret that reveals a light seed.
test.beforeEach(async ({ page }) => { await enterForest(page); await setView(page, 0, 0.28) })

test('the glen is reachable on foot through its pass west of the camp', async ({ page }) => {
  const z = (GLEN_PASS.minZ + GLEN_PASS.maxZ) / 2
  await teleport(page, CAMP.minX + 3, z); await setView(page, Math.PI / 2, 0.28) // yaw π/2: W walks west (-X)
  await hold(page, 'KeyW', 4800)
  expect((await snapshot(page)).position[0]).toBeLessThan(GLEN_PASS.minX + 2) // through the pass into the glen
})

test('a light seed is picked up once and counted', async ({ page }) => {
  const i = seeds.findIndex(s => !s.secret), s = seeds[i]
  await teleport(page, s.x, s.z)
  await expect.poll(async () => (await snapshot(page)).seeds).toBe(1)
  await teleport(page, s.x + 5, s.z); await teleport(page, s.x, s.z); await page.waitForTimeout(300)
  expect((await snapshot(page)).seeds).toBe(1)
})

test('echo stones in the hummed order solve the glen and reveal its seed', async ({ page }) => {
  const away = async (x: number, z: number) => { await teleport(page, x + 6, z); await page.waitForTimeout(150) }
  for (const n of ECHO_ORDER) { const s = echoStones[n]; await away(s.x, s.z); await teleport(page, s.x + 1.2, s.z); await page.waitForTimeout(250) }
  await expect.poll(async () => (await snapshot(page)).secrets).toContain('glen')
  const seed = seeds.find(s => s.secret === 'glen')!
  await teleport(page, seed.x, seed.z)
  await expect.poll(async () => (await snapshot(page)).seeds).toBe(1)
})

test('waking every giant mushroom solves the hollow', async ({ page }) => {
  for (const m of giantMushrooms) { await teleport(page, m.x + m.radius + 0.9, m.z); await page.waitForTimeout(200) }
  await expect.poll(async () => (await snapshot(page)).secrets).toContain('hollow')
})

test('the ford only counts stone by stone, then wakes the shrine', async ({ page }) => {
  await teleport(page, fordStones[2].x, fordStones[2].z); await page.waitForTimeout(200) // skipping ahead does nothing useful
  for (const f of fordStones) { await teleport(page, f.x, f.z + 1.5); await page.waitForTimeout(120); await teleport(page, f.x, f.z); await page.waitForTimeout(200) }
  await expect.poll(async () => (await snapshot(page)).secrets).toContain('lake')
})

test('standing at the overlook edge opens the vista', async ({ page }) => {
  await teleport(page, VISTA_POINT[0], VISTA_POINT[1])
  await expect.poll(async () => (await snapshot(page)).secrets, { timeout: 8_000 }).toContain('overlook')
})
