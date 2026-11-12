import { describe, expect, it } from 'vitest'
import { CROSSING, FLOCK_SIZE, PERIOD, SPAN, birdPosition, crossingFor } from './birds'

describe('bird flocks', () => {
  it('crosses past the player, high above the ground, and is gone between crossings', () => {
    const center = { x: 10, z: -20 }, c = crossingFor(0, 100, center)
    const mid = birdPosition(c, 0, c.start + CROSSING / 2)!
    expect(Math.hypot(mid.x - center.x, mid.z - center.z)).toBeLessThan(25)
    expect(mid.y).toBeGreaterThan(10)
    expect(birdPosition(c, 0, c.start - 0.1)).toBeNull()
    expect(birdPosition(c, FLOCK_SIZE - 1, c.start + CROSSING + 0.1)).toBeNull()
    expect(CROSSING).toBeLessThan(PERIOD)
  })
  it('flies in a loose formation along the crossing', () => {
    const c = crossingFor(1, 50, { x: 0, z: 0 }), t = c.start + CROSSING / 2
    const birds = Array.from({ length: FLOCK_SIZE }, (_, i) => birdPosition(c, i, t)!)
    for (const b of birds.slice(1)) {
      const d = Math.hypot(b.x - birds[0].x, b.z - birds[0].z)
      expect(d).toBeGreaterThan(0.5); expect(d).toBeLessThan(SPAN * 0.2)
    }
  })
  it('keeps one crossing for the whole period and changes it for the next', () => {
    const a = crossingFor(2, 300, { x: 0, z: 0 }), b = crossingFor(2, a.start + PERIOD - 0.01, { x: 0, z: 0 }), next = crossingFor(2, a.start + PERIOD + 0.01, { x: 0, z: 0 })
    expect(b.start).toBe(a.start); expect(b.angle).toBe(a.angle)
    expect(next.start).toBeCloseTo(a.start + PERIOD)
  })
})
