import { expect, type Page } from '@playwright/test'
import type { DebugSnapshot } from '../src/game/debug/debugApi'
export async function enterForest(page: Page) {
  await page.goto('./?debug')
  await page.getByRole('button', { name: /开始探索/ }).click()
  await page.waitForFunction(() => window.__lumenwood?.snapshot().phase === 'playing')
}
export const snapshot = (page: Page) => page.evaluate(() => window.__lumenwood!.snapshot())
export const teleport = (page: Page, x: number, z: number) => page.evaluate(([px, pz]) => window.__lumenwood!.teleport(px, pz), [x, z] as const)
export const setView = (page: Page, yaw: number, pitch: number) => page.evaluate(([y, p]) => window.__lumenwood!.setView(y, p), [yaw, pitch] as const)
export const speed = (s: DebugSnapshot) => Math.hypot(s.velocity[0], s.velocity[1])
export async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key)
}
/** Waits for a few rendered frames so frame-loop state reflects the last command. */
export const frames = (page: Page, count = 3) => page.evaluate(n => new Promise<void>(done => {
  let left = n
  const tick = () => { if (--left > 0) requestAnimationFrame(tick); else done() }
  requestAnimationFrame(tick)
}), count)
export async function expectPhase(page: Page, phase: string) { await expect.poll(async () => (await snapshot(page)).phase).toBe(phase) }
