import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { enterForest, setView, snapshot } from './helpers'
// Baseline recorder, not a gate: numbers depend on the GPU path, which is recorded alongside.
test('performance baseline while walking a loop', async ({ page }, testInfo) => {
  await enterForest(page)
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown'
  })
  await page.keyboard.down('KeyW')
  const deltas = await page.evaluate(() => new Promise<number[]>(done => {
    const out: number[] = []
    let last = performance.now()
    const end = last + 6000
    const tick = (now: number) => {
      out.push(now - last); last = now
      window.__lumenwood!.setView(now / 2000, 0.28) // slow turn so the view sweeps the forest
      if (now < end) requestAnimationFrame(tick); else done(out.slice(30)) // drop warm-up frames
    }
    requestAnimationFrame(tick)
  }))
  await page.keyboard.up('KeyW'); await setView(page, 0, 0.28)
  const sorted = [...deltas].sort((a, b) => a - b), avg = deltas.reduce((s, d) => s + d, 0) / deltas.length
  const s = await snapshot(page)
  const result = {
    date: new Date().toISOString(), channel: testInfo.project.use.channel ?? 'bundled', headless: testInfo.project.use.headless, renderer,
    viewport: page.viewportSize(), devicePixelRatio: await page.evaluate(() => window.devicePixelRatio), frames: deltas.length,
    avgFrameMs: +avg.toFixed(2), p95FrameMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2), maxFrameMs: +sorted[sorted.length - 1].toFixed(2),
    avgFps: +(1000 / avg).toFixed(1), drawCalls: s.drawCalls, triangles: s.triangles,
  }
  await writeFile(testInfo.outputPath('perf-baseline.json'), JSON.stringify(result, null, 2))
  testInfo.annotations.push({ type: 'perf', description: JSON.stringify(result) })
  expect(deltas.length).toBeGreaterThan(30)
})
