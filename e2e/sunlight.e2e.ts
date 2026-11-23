import { expect, test, type Page } from '@playwright/test'
import { enterForest, hold, setView, snapshot, teleport } from './helpers'
import { sunRavineGap } from '../src/game/features/sunlight/landform'

async function walkTo(page: Page, x: number, z: number, reach = 0.45) {
  for (let step = 0; step < 120; step++) {
    const s = await snapshot(page), dx = x - s.position[0], dz = z - s.position[1]
    if (Math.hypot(dx, dz) < reach) return
    await setView(page, Math.atan2(-dx, -dz), 0.35)
    await hold(page, 'KeyW', 160)
  }
  throw new Error(`Could not walk to ${x},${z}; stopped at ${(await snapshot(page)).position}`)
}

test('daytime mirrors grow a real crossing: approach, turn, grow, walk across, collect, return and resume', async ({ page }) => {
  test.setTimeout(90_000)
  await enterForest(page); await page.waitForSelector('.loading-veil.done')
  const objective = page.getByRole('region', { name: '当前目标' })
  await expect(objective).toContainText('借一束阳光')
  await page.keyboard.press('e')
  expect((await snapshot(page)).sunlight.steps).toEqual([0, 4]) // out of reach
  await walkTo(page, 12, -16.7, 0.6)
  await expect(page.getByRole('region', { name: '日光镜互动' })).toContainText('日光镜 1')
  await page.keyboard.press('e'); await page.keyboard.press('e')
  await expect.poll(async () => (await snapshot(page)).sunlight.relay).toBe(true)
  await expect(objective).toContainText('第二座镜')
  await walkTo(page, 23.5, -16.6, 0.4)
  await page.keyboard.press('q'); await page.keyboard.press('q'); await page.keyboard.press('q'); await page.keyboard.press('q')
  await expect.poll(async () => (await snapshot(page)).sunlight.receiver).toBe(true)
  await page.keyboard.press('Escape')
  await expect.poll(async () => (await snapshot(page)).phase).toBe('paused')
  const frozen = (await snapshot(page)).sunlight.growth
  await page.waitForTimeout(1100)
  expect((await snapshot(page)).sunlight.growth).toBe(frozen)
  await page.getByRole('button', { name: /继续探索/ }).click()
  await expect.poll(async () => (await snapshot(page)).sunlight.grown, { timeout: 8000 }).toBe(true)
  await walkTo(page, 22.5, -14, 0.2)
  await walkTo(page, 22.5, -9.5, 0.3)
  expect((await snapshot(page)).height).toBeGreaterThan(0.6)
  await walkTo(page, 22.5, -4.5)
  await expect(objective).toContainText('取回光之种子')
  await walkTo(page, 22, 0, 0.5)
  await expect.poll(async () => (await snapshot(page)).sunlight.crossed).toBe(true)
  expect((await snapshot(page)).seeds).toBe(1)
  await expect(objective).toContainText('沿藤桥回到营地')
  await walkTo(page, 22.5, -4.5); await walkTo(page, 22.5, -15.2)
  await walkTo(page, 14, -16, 0.6)
  await expect(objective).toContainText('唤醒')
  // Save the on-foot result, reload, and verify that night preserves the bridge while disabling rotation.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lumenwood-save-v1')!).sunlight.crossed)).toBe(true)
  await page.reload(); await page.getByRole('button', { name: /继续旅程/ }).click()
  await page.waitForSelector('.loading-veil.done')
  expect((await snapshot(page)).sunlight).toMatchObject({ steps: [2, 0], grown: true, crossed: true })
  await teleport(page, 12, -16.7)
  await page.evaluate(() => window.__lumenwood!.setTimeOfDay('night'))
  await expect.poll(async () => (await snapshot(page)).timeBlend, { timeout: 12_000 }).toBeGreaterThan(0.9)
  await page.keyboard.press('e')
  expect((await snapshot(page)).sunlight.steps).toEqual([2, 0])
  await teleport(page, 22.5, -9.5); await page.waitForTimeout(100)
  expect((await snapshot(page)).height).toBeGreaterThan(0.6)
})

test('ravine stays blocked before solving; dark and paused mirrors ignore input', async ({ page }) => {
  await enterForest(page); await page.waitForSelector('.loading-veil.done')
  await teleport(page, 22.5, -14.5); await setView(page, Math.PI, 0.3); await hold(page, 'KeyW', 1800)
  const bank = await snapshot(page)
  // Rounded banks permit sideways sliding; verify actual clearance and dry footing rather than the former box's Z.
  expect(sunRavineGap(...bank.position)).toBeLessThanOrEqual(-0.34)
  expect(Math.abs(bank.height)).toBeLessThan(0.05)
  expect(bank.position[1]).toBeLessThan(-11)
  await teleport(page, 12, -16.7)
  await page.keyboard.press('Escape'); await page.keyboard.press('e')
  expect((await snapshot(page)).sunlight.steps).toEqual([0, 4])
  await page.getByRole('button', { name: /继续探索/ }).click()
  await page.evaluate(() => window.__lumenwood!.setTimeOfDay('twilight'))
  await expect.poll(async () => (await snapshot(page)).timeBlend, { timeout: 12_000 }).toBeGreaterThan(0.8)
  await page.keyboard.press('e')
  expect((await snapshot(page)).sunlight).toMatchObject({ steps: [0, 4], grown: false })
  await expect(page.getByRole('region', { name: '日光镜互动' })).toContainText('需要阳光')
})
