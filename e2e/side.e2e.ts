import { expect, test } from '@playwright/test'
import { enterForest, frames, hold, setView, snapshot, teleport } from './helpers'
import { ECHO_ORDER, REEF_HEART, VALE_HEART, VISTA_POINT, echoStones, fordStones, giantMushrooms, reefCairns, seeds, valeStones } from '../src/game/world/zones/sideLayout'
import { BEACH, CAMP, GLEN, GLEN_LAKE_TRAIL, GLEN_PASS, REEF } from '../src/game/world/regions'
// Side areas & map expansion (2026-11-24): side areas, resonance secrets, coastal reef, and loop trails.
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

test('sunstone vale pillars respond to lantern resonance and drop the vale seed', async ({ page }) => {
  // Standing at the north and south midpoints (12 m from each pair) lets two F pulses light all four pillars concurrently.
  await teleport(page, VALE_HEART[0], VALE_HEART[1] + 5); await frames(page)
  await page.keyboard.press('KeyF')
  await page.waitForTimeout(2000)
  await teleport(page, VALE_HEART[0], VALE_HEART[1] - 5); await frames(page)
  await page.keyboard.press('KeyF')
  await expect.poll(async () => (await snapshot(page)).secrets, { timeout: 8_000 }).toContain('vale')
  expect(valeStones.length).toBe(4)
  const seed = seeds.find(s => s.secret === 'vale')!
  await teleport(page, seed.x, seed.z)
  await expect.poll(async () => (await snapshot(page)).seeds).toBe(1)
})

test('tidewater reef is reachable across the cove causeway and cairns solve the reef', async ({ page }) => {
  await teleport(page, 0, BEACH.minZ + 1); await setView(page, 0, 0.28); await frames(page)
  await page.keyboard.down('ShiftLeft')
  try { await hold(page, 'KeyW', 4200) } // yaw 0: Shift+W sprints south (-Z) across the sandspit onto REEF
  finally { await page.keyboard.up('ShiftLeft') }
  expect((await snapshot(page)).position[1]).toBeLessThan(REEF.maxZ)
  for (const c of reefCairns) { await teleport(page, c.x, c.z + 1.5); await page.waitForTimeout(200) }
  await expect.poll(async () => (await snapshot(page)).secrets).toContain('reef')
  const seed = seeds.find(s => s.secret === 'reef')!
  await teleport(page, REEF_HEART[0], REEF_HEART[1])
  await teleport(page, seed.x, seed.z)
  await expect.poll(async () => (await snapshot(page)).seeds).toBe(1)
})

test('west glen-lake loop stays closed before camp lights, then opens northward', async ({ page }) => {
  const x = (GLEN_LAKE_TRAIL.minX + GLEN_LAKE_TRAIL.maxX) / 2
  await teleport(page, x, GLEN.maxZ - 1.5); await hold(page, 'KeyS', 1200) // yaw 0: S walks north (+Z)
  expect((await snapshot(page)).position[1]).toBeLessThanOrEqual(GLEN.maxZ + 0.001)
  await expect(page.locator('.world-prompt')).toContainText('点亮林间营地全部 3 盏灯笼开启')
  await page.evaluate(() => {
    const save = { v: 2, released: [0, 1, 2, 3, 4, 5], lit: [true, true, true, false, false, false, false, false, false], completed: ['camp'], finale: false, captions: [], ending: false, position: [0, 0], seeds: [], secrets: [] }
    localStorage.setItem('lumenwood-save-v1', JSON.stringify(save))
  })
  await page.reload(); await page.getByRole('button', { name: /继续旅程/ }).click()
  await page.waitForFunction(() => window.__lumenwood?.snapshot().phase === 'playing')
  await teleport(page, x, GLEN.maxZ - 1.5); await setView(page, 0, 0.28)
  await hold(page, 'KeyS', 1500)
  expect((await snapshot(page)).position[1]).toBeGreaterThan(GLEN.maxZ + 2)
})

test('expanded southern coastal woods connect beach directly to glen and hollow without invisible walls', async ({ page }) => {
  await teleport(page, -44, -62); await setView(page, Math.PI / 2, 0.28); await frames(page) // yaw π/2: W walks west (-X)
  await hold(page, 'KeyW', 2200)
  expect((await snapshot(page)).position[0]).toBeLessThan(-50) // crossed beyond old beach edge into west cove woods
  await teleport(page, 44, -62); await setView(page, -Math.PI / 2, 0.28); await frames(page) // yaw -π/2: W walks east (+X)
  await hold(page, 'KeyW', 2200)
  expect((await snapshot(page)).position[0]).toBeGreaterThan(50) // crossed beyond old beach edge into east cove woods
})
