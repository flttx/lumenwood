import { describe, expect, it } from 'vitest'
import { resetWind, sampleWind, updateWind, wind } from './wind'

describe('shared forest wind field', () => {
  it('returns unit wind directions and bounded gust factors across time', () => {
    for (let t = 0; t <= 120; t += 3.5) {
      const s = sampleWind(t, 0, 0)
      expect(Math.hypot(s.dirX, s.dirZ)).toBeCloseTo(1, 5)
      expect(s.gust).toBeGreaterThanOrEqual(0)
      expect(s.gust).toBeLessThanOrEqual(1)
      expect(s.strength).toBeGreaterThanOrEqual(0.25)
    }
  })

  it('amplifies wind strength on the exposed highland plateau and softens it in the sheltered wetland', () => {
    const camp = sampleWind(12, 0, 0)
    const highland = sampleWind(12, 1, 0)
    const wetland = sampleWind(12, 0, 1)
    expect(highland.strength).toBeGreaterThan(camp.strength)
    expect(wetland.strength).toBeLessThan(camp.strength)
    expect(highland.dirX).toBeCloseTo(camp.dirX)
    expect(highland.dirZ).toBeCloseTo(camp.dirZ)
  })

  it('updates and resets the shared frame-loop singleton cleanly', () => {
    updateWind(42, 1, 0)
    expect(wind.phase).toBe(42)
    resetWind()
    expect(wind.phase).toBe(0)
    expect(Math.hypot(wind.dirX, wind.dirZ)).toBeCloseTo(1, 5)
  })
})
