import { expect, test } from '@playwright/test'
import { enterForest, snapshot, teleport } from './helpers'
import { echoStones, ECHO_ORDER } from '../src/game/world/zones/sideLayout'

test('side clues stay current, the player can toggle the main route, and solved secrets point at the reward', async ({ page }) => {
  await enterForest(page); await page.waitForSelector('.loading-veil.done')
  await teleport(page, -110, 8)
  const goal = page.getByRole('region', { name: '当前目标' })
  await expect(goal).toContainText('倾听瀑布'); await expect(goal).toContainText('按 T 查看主线')
  await page.keyboard.press('t'); await expect(goal).toContainText('沿山口返回主线林径')
  await page.keyboard.press('t'); await expect(goal).toContainText('倾听瀑布')
  for (const i of ECHO_ORDER) { await teleport(page, echoStones[i].x + 1.2, echoStones[i].z); await page.waitForTimeout(350) }
  await expect.poll(async () => (await snapshot(page)).secrets).toContain('glen')
  await expect(goal).toContainText('取回种子')
  await teleport(page, 0, 0); await expect(goal).toContainText('借一束阳光')
})

test('the daytime reward leaves a full twilight stage at wetland arrival and does not rewind on return', async ({ page }) => {
  test.setTimeout(45_000)
  await enterForest(page); await page.waitForSelector('.loading-veil.done')
  await page.evaluate(() => {
    localStorage.setItem('lumenwood-save-v1', JSON.stringify({ v: 2, released: [0, 1, 2, 3, 4, 5], lit: [true, true, true, false, false, false, false, false, false], completed: ['camp'], finale: false, captions: ['start', 'sunStart', 'firstFirefly', 'firstLit', 'campDone'], ending: false, position: [-15, 105], seeds: [8], secrets: [], sunlight: { steps: [2, 0], grown: true, crossed: true } }))
  })
  await page.reload(); await page.getByRole('button', { name: /继续旅程/ }).click()
  await page.waitForSelector('.loading-veil.done'); await page.waitForTimeout(12_000)
  expect((await snapshot(page)).timeBlend).toBeGreaterThan(0.9)
  expect((await snapshot(page)).timeBlend).toBeLessThan(1)
  await teleport(page, 0, 0); await page.waitForTimeout(4000)
  expect((await snapshot(page)).timeBlend).toBeGreaterThan(0.9)
  expect((await snapshot(page)).timeBlend).toBeLessThan(1)
})
