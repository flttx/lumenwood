import { expect, test } from '@playwright/test'
import { enterForest, expectPhase, frames, hold, setView, snapshot, speed, teleport } from './helpers'
import { openEastEdge, openTrunk } from './layout'
import { CAMP } from '../src/game/world/regions'
import { cabin, cabinCollider } from '../src/game/world/zones/campLayout'
import { flowers } from '../src/game/world/zones/floraLayout'
test.beforeEach(async ({ page }) => { await enterForest(page); await setView(page, 0, 0.28) })

test('walk accelerates, run is faster, release decelerates to rest', async ({ page }) => {
  await page.keyboard.down('KeyW'); await frames(page, 2)
  const early = speed(await snapshot(page))
  await page.waitForTimeout(700)
  const walking = await snapshot(page)
  expect(early).toBeLessThan(speed(walking))
  expect(speed(walking)).toBeGreaterThan(3.4); expect(speed(walking)).toBeLessThan(3.9)
  expect(walking.position[1]).toBeLessThan(-1) // yaw 0: forward is -Z
  await page.keyboard.down('Shift'); await page.waitForTimeout(700)
  const running = speed(await snapshot(page))
  expect(running).toBeGreaterThan(6.3); expect(running).toBeLessThan(7.1)
  await page.keyboard.up('Shift'); await page.keyboard.up('KeyW')
  await frames(page, 2)
  expect(speed(await snapshot(page))).toBeGreaterThan(0.3) // eases out, no hard stop
  await expect.poll(async () => speed(await snapshot(page))).toBe(0)
})

test('trunks block the player', async ({ page }) => {
  const t = openTrunk, start = t.z - t.radius - 2 // yaw 0: S walks +Z, straight at the trunk
  await teleport(page, t.x, start)
  await hold(page, 'KeyS', 1500)
  const [x, z] = (await snapshot(page)).position
  expect(Math.hypot(x - t.x, z - t.z)).toBeGreaterThan(t.radius + 0.3)
  expect(z).toBeGreaterThan(start + 0.8) // actually moved up to the trunk
  expect(z).toBeLessThan(t.z) // ...and stopped on the near side instead of passing through
})

test('world boundary holds', async ({ page }) => {
  await teleport(page, CAMP.maxX - 3, openEastEdge)
  await hold(page, 'KeyD', 1500)
  expect((await snapshot(page)).position[0]).toBeCloseTo(CAMP.maxX, 5)
})

test('camera pulls in in front of a trunk and eases back out', async ({ page }) => {
  // yaw 0 puts the camera on the +Z side of the player; stand just south of the trunk so it sits between them.
  await teleport(page, openTrunk.x, openTrunk.z - openTrunk.radius - 1); await frames(page)
  const blocked = (await snapshot(page)).cameraDistance
  expect(blocked).toBeGreaterThanOrEqual(1.2); expect(blocked).toBeLessThan(3)
  await teleport(page, 0, 0); await setView(page, Math.PI * 0.75, 0.28); await frames(page, 2) // the spawn clearing
  expect((await snapshot(page)).cameraDistance).toBeLessThan(6) // no snap back
  await expect.poll(async () => (await snapshot(page)).cameraDistance, { timeout: 5000 }).toBeGreaterThan(6.4)
})

test('Esc pauses and resumes; frozen while paused', async ({ page }) => {
  await page.keyboard.press('Escape')
  await expectPhase(page, 'paused')
  await expect(page.getByRole('heading', { name: '稍作停留' })).toBeVisible()
  const before = (await snapshot(page)).position
  await hold(page, 'KeyW', 300)
  expect((await snapshot(page)).position).toEqual(before)
  await page.waitForTimeout(350)
  await page.keyboard.press('Escape')
  await expectPhase(page, 'playing')
})

test('losing window focus or hiding the tab pauses', async ({ page }) => {
  await page.keyboard.down('KeyW')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expectPhase(page, 'paused')
  await page.keyboard.up('KeyW')
  await page.getByRole('button', { name: /继续探索/ }).click()
  await expectPhase(page, 'playing')
  await frames(page)
  expect(speed(await snapshot(page))).toBe(0) // no stuck key after refocus
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
  await expectPhase(page, 'paused')
})

test('pointer lock drives mouse look; losing lock pauses', async ({ page }) => {
  await expect(page.getByText('点击画面捕获鼠标以环视')).toBeVisible()
  await page.locator('canvas').click()
  await expect.poll(async () => (await snapshot(page)).pointerLocked).toBe(true)
  await expect(page.getByText('移动鼠标环视')).toBeVisible()
  const yaw = (await snapshot(page)).yaw
  await page.mouse.move(640, 360); await page.mouse.move(740, 360)
  await expect.poll(async () => (await snapshot(page)).yaw).not.toBe(yaw)
  await page.evaluate(() => document.exitPointerLock()) // same event path as the browser releasing lock on Esc
  await expectPhase(page, 'paused')
})

test('cabin walls block the player', async ({ page }) => {
  // ARC-001's door faces the spawn; start 4 m in front of the door and walk at it.
  const ux = -cabin.x / Math.hypot(cabin.x, cabin.z), uz = -cabin.z / Math.hypot(cabin.x, cabin.z)
  await teleport(page, cabin.x + ux * 4, cabin.z + uz * 4); await setView(page, Math.atan2(ux, uz), 0.28) // camera behind, walking toward the cabin
  await hold(page, 'KeyW', 1500)
  const [x, z] = (await snapshot(page)).position
  const fromCentre = Math.hypot(x - cabin.x, z - cabin.z)
  expect(fromCentre).toBeLessThan(cabinCollider.halfZ + 1.1) // actually walked up to the wall
  expect(fromCentre).toBeGreaterThan(cabinCollider.halfZ + 0.3) // ...and stopped outside it
})

test('forest trees render from the VEG-001 model', async ({ page }) => {
  // The ground alone is a few thousand triangles; the instanced forest adds far more once the GLBs load.
  await expect.poll(async () => (await snapshot(page)).triangles, { timeout: 10_000 }).toBeGreaterThan(20_000)
})

test('soundscape starts with the game and suspends while paused', async ({ page }) => {
  await expect.poll(async () => (await snapshot(page)).sound).toBe('running')
  await page.keyboard.press('Escape')
  await expectPhase(page, 'paused')
  await expect.poll(async () => (await snapshot(page)).sound).toBe('suspended')
  await page.getByRole('button', { name: /继续探索/ }).click()
  await expect.poll(async () => (await snapshot(page)).sound).toBe('running')
})

test('a flower wakes once when approached and again after walking away', async ({ page }) => {
  // Waking needs < 1.6 m, re-arming > 3.2 m.
  const f = flowers[0]
  await teleport(page, f.x, f.z + 1)
  await expect.poll(async () => (await snapshot(page)).chimes, { timeout: 10_000 }).toBe(1)
  await teleport(page, f.x, f.z + 1.3); await frames(page) // still close: no repeat
  expect((await snapshot(page)).chimes).toBe(1)
  await teleport(page, f.x, f.z + 4); await frames(page) // 4 m away re-arms
  await teleport(page, f.x, f.z + 0.8)
  await expect.poll(async () => (await snapshot(page)).chimes).toBe(2)
})
