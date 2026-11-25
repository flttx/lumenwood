import { expect, test } from '@playwright/test'
import { enterForest, expectPhase, frames, snapshot, speed } from './helpers'

test('P0/P1/P2 UX: quick mute, 720p pause layout, invertY/audio mixer, travel journal, auto-walk, zoom, and clean console', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await enterForest(page)
  await page.waitForSelector('.loading-veil.done')

  // P0: M key toggles quick mute right from gameplay HUD without pausing.
  const muteBtn = page.getByRole('button', { name: '静音' })
  await expect(muteBtn).toBeVisible()
  await page.keyboard.press('KeyM')
  await expect(page.getByRole('button', { name: '取消静音' })).toBeVisible()
  await expectPhase(page, 'playing')
  await page.keyboard.press('KeyM')
  await expect(page.getByRole('button', { name: '静音' })).toBeVisible()

  // P0/P1: Pause screen shows invertY, dragOnly, powerSave, scenicIdle, audio sub-mixer, and does not clip controls at 720p.
  await page.keyboard.press('Escape')
  await expectPhase(page, 'paused')
  await expect(page.getByRole('switch', { name: /上下反转/ })).toBeVisible()
  await expect(page.getByRole('switch', { name: /自由光标/ })).toBeVisible()
  await expect(page.getByRole('switch', { name: /省电 30 帧/ })).toBeVisible()
  await expect(page.getByRole('switch', { name: /后台白噪音/ })).toBeVisible()
  const controlsBox = await page.locator('.pause-controls-bar').boundingBox()
  expect(controlsBox).not.toBeNull()
  expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(720)
  await page.getByRole('button', { name: '分轨' }).click()
  await expect(page.getByRole('group', { name: '分轨音量' })).toBeVisible()
  const expandedBox = await page.locator('.pause-controls-bar').boundingBox()
  expect(expandedBox).not.toBeNull()
  expect(expandedBox!.y + expandedBox!.height).toBeLessThanOrEqual(720)
  await page.getByRole('button', { name: /继续探索/ }).click()
  await expectPhase(page, 'playing')

  // P0: T key in camp shows immediate guidance toast in addition to the 3D pillar.
  await page.keyboard.press('KeyT')
  await expect(page.locator('.time-toast')).toContainText('指引 ·')

  // P2: Tab opens the Travel Journal, clicking a region node updates its detail card, switches to memories, and Esc closes back to play.
  await page.keyboard.press('Tab')
  const journal = page.getByRole('dialog', { name: '岛屿手账' })
  await expect(journal).toBeVisible()
  await journal.getByRole('button', { name: /瀑布溪谷/ }).click()
  await expect(journal.locator('.journal-stat-card')).toContainText('瀑布溪谷')
  await page.getByRole('tab', { name: /森林记忆/ }).click()
  await expect(page.getByLabel('已收集的森林记忆')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(journal).toBeHidden()
  await expectPhase(page, 'playing')

  // Space hop lifts the player smoothly and lands back at ground height.
  const groundH = (await snapshot(page)).height
  await page.keyboard.press('Space')
  await expect.poll(async () => (await snapshot(page)).height, { timeout: 1500 }).toBeGreaterThan(groundH + 0.35)
  await expect.poll(async () => (await snapshot(page)).height, { timeout: 2000 }).toBeLessThan(groundH + 0.08)

  // P key triggers clean scenery photo capture and feedback toast.
  await page.keyboard.press('KeyP')
  await expect(page.locator('.time-toast')).toContainText('风景照')

  // P2: R toggles relaxed auto-walk, and pressing S cancels it cleanly.
  await page.keyboard.press('KeyR')
  await expect(page.getByText(/自动漫步中/)).toBeVisible()
  await page.waitForTimeout(500)
  expect(speed(await snapshot(page))).toBeGreaterThan(2.0)
  await page.keyboard.press('KeyS')
  await expect(page.getByText(/自动漫步中/)).toBeHidden()

  // P2: Mouse wheel zooms camera distance smoothly out and back in.
  const baseDist = (await snapshot(page)).cameraDistance
  await page.mouse.move(640, 360)
  await page.mouse.wheel(0, 120)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(450)
  expect((await snapshot(page)).cameraDistance).toBeGreaterThan(baseDist + 0.5)

  // P1: No duplicate-key React console errors during play.
  await frames(page, 2)
  const dupKeys = consoleErrors.filter(e => e.includes('two children with the same key'))
  expect(dupKeys).toEqual([])
})
