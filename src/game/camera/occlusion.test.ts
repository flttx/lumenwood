import { describe, expect, it } from 'vitest'
import { occludedDistance } from './occlusion'
const trunk = { x: 0, z: 3, radius: 0.4, height: 4 }
describe('occludedDistance', () => {
  it('returns the distance to the near face of a blocking trunk', () => {
    expect(occludedDistance({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, 6.5, [trunk])).toBeCloseTo(2.6)
    expect(occludedDistance({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, 6.5, [trunk], 0.3)).toBeCloseTo(2.3)
  })
  it('ignores trunks that are missed, behind, beyond range or below the ray', () => {
    const origin = { x: 0, y: 1, z: 0 }
    expect(occludedDistance(origin, { x: 1, y: 0, z: 0 }, 6.5, [trunk])).toBe(6.5)
    expect(occludedDistance(origin, { x: 0, y: 0, z: -1 }, 6.5, [trunk])).toBe(6.5)
    expect(occludedDistance(origin, { x: 0, y: 0, z: 1 }, 2, [trunk])).toBe(2)
    const steep = Math.SQRT1_2
    // Rises to y≈3.6 at the trunk face: above a 3 m trunk, inside a 4 m one.
    expect(occludedDistance(origin, { x: 0, y: steep, z: steep }, 10, [{ ...trunk, height: 3 }])).toBe(10)
    expect(occludedDistance(origin, { x: 0, y: steep, z: steep }, 10, [trunk])).toBeCloseTo(2.6 / steep)
  })
  it('picks the nearest of several occluders and skips an origin inside padding', () => {
    expect(occludedDistance({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, 6.5, [trunk, { ...trunk, z: 1.5 }])).toBeCloseTo(1.1)
    expect(occludedDistance({ x: 0, y: 1, z: 2.8 }, { x: 0, y: 0, z: 1 }, 6.5, [trunk])).toBe(6.5)
  })
  it('detects a camera entering a raised crown through its bottom or top cap', () => {
    const crown = { x: 0, z: 0, radius: 3, base: 2, height: 2 }
    const d = Math.SQRT1_2
    expect(occludedDistance({ x: 0, y: 1, z: 0 }, { x: 0, y: d, z: d }, 6, [crown])).toBeCloseTo(1 / d)
    expect(occludedDistance({ x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 6, [crown])).toBeCloseTo(1)
    expect(occludedDistance({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, 6, [crown])).toBe(6)
    expect(occludedDistance({ x: 4, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 6, [crown])).toBe(6)
  })
})
