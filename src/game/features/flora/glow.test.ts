import { describe, expect, it } from 'vitest'
import { GLOW_BASE, GLOW_FAR, GLOW_NEAR, GLOW_PEAK, glowTarget } from './glow'
describe('glowTarget', () => {
  it('rests at base far away and peaks up close', () => {
    expect(glowTarget(GLOW_FAR + 5)).toBe(GLOW_BASE)
    expect(glowTarget(0)).toBe(GLOW_PEAK)
    expect(glowTarget(GLOW_NEAR)).toBe(GLOW_PEAK)
  })
  it('rises monotonically as the player approaches', () => {
    const samples = [4, 3.5, 3, 2.5, 2, 1.5].map(glowTarget)
    samples.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(samples[i]))
  })
})
