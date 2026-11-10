import { expect, test } from '@playwright/test'
import { enterForest, expectPhase, frames, hold, setView, snapshot, speed, teleport } from './helpers'
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
  await teleport(page, 0, 5) // tree 0 stands at (0, 7) with trunk radius 0.32
  await hold(page, 'KeyS', 1500)
  const [x, z] = (await snapshot(page)).position
  expect(Math.hypot(x, z - 7)).toBeGreaterThan(0.66)
  expect(z).toBeGreaterThan(5.5) // actually moved up to the trunk
  expect(z).toBeLessThan(7) // ...and stopped on the near side instead of passing through
})

test('world boundary holds', async ({ page }) => {
  await teleport(page, 20, -20)
  await hold(page, 'KeyD', 1200)
  expect((await snapshot(page)).position[0]).toBeCloseTo(22, 5)
})

test('camera pulls in in front of a trunk and eases back out', async ({ page }) => {
  await teleport(page, 0, 4.5); await frames(page)
  const blocked = (await snapshot(page)).cameraDistance
  expect(blocked).toBeGreaterThanOrEqual(1.2); expect(blocked).toBeLessThan(2.5)
  await teleport(page, 0, -3); await frames(page, 2)
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

test('forest trees render from the VEG-001 model', async ({ page }) => {
  // Greybox ground and player alone are under 1,000 triangles; 48 instanced trees add far more once the GLB loads.
  await expect.poll(async () => (await snapshot(page)).triangles, { timeout: 10_000 }).toBeGreaterThan(20_000)
})
