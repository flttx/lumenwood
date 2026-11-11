import { describe, expect, it } from 'vitest'
import { glowFalloff } from './glowSprites'
import { GLOW_BASE, GLOW_FAR, GLOW_NEAR, GLOW_PEAK, WAKE_NEAR, WAKE_REARM, WAVE_DURATION, WAVE_RADIUS, glowTarget, lightWave, nextAwake } from './glow'
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
describe('waking', () => {
  it('wakes once on approach and re-arms only after walking away', () => {
    let awake = false, wakes = 0
    for (const d of [5, 3, WAKE_NEAR - 0.1, 1, 2.5, WAKE_NEAR - 0.1, 3, WAKE_REARM + 0.1, 2, WAKE_NEAR - 0.1]) {
      const next = nextAwake(awake, d)
      if (next && !awake) wakes++
      awake = next
    }
    expect(wakes).toBe(2) // lingering between the thresholds never re-triggers
  })
  it('the light wave grows outward and fades, then ends', () => {
    expect(lightWave(-0.1)).toBeNull(); expect(lightWave(WAVE_DURATION)).toBeNull(); expect(lightWave(Infinity)).toBeNull()
    expect(lightWave(0)).toEqual({ radius: 0, opacity: 1 })
    const a = lightWave(0.4)!, b = lightWave(1.2)!
    expect(b.radius).toBeGreaterThan(a.radius); expect(b.opacity).toBeLessThan(a.opacity)
    expect(b.radius).toBeLessThan(WAVE_RADIUS)
  })
})
describe('glowFalloff', () => {
  it('is brightest at the centre, fades monotonically and reaches 0 at the edge', () => {
    expect(glowFalloff(0)).toBe(1); expect(glowFalloff(1)).toBe(0); expect(glowFalloff(1.5)).toBe(0)
    const samples = [0, 0.2, 0.4, 0.6, 0.8].map(glowFalloff)
    samples.slice(1).forEach((v, i) => expect(v).toBeLessThan(samples[i]))
  })
})
