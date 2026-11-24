import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { safeCameraArm } from './arm'

describe('full cinematic camera arm', () => {
  it('stops a cinematic extension at a trunk beyond the ordinary camera range', () => {
    const p = new Vector3(0, 1, 0), dir = new Vector3(0, 0, 1), tree = { x: 0, z: 10, radius: 0.5, height: 5 }
    expect(safeCameraArm(p, dir, 6.5, 9, 0, [tree], [])).toBeCloseTo(9.2)
    expect(safeCameraArm(p, dir.set(0, 0, 1), 6.5, 0, 0, [tree], [])).toBe(6.5)
  })
  it('checks the lifted vista ray against raised foliage and keeps a unit direction', () => {
    const p = new Vector3(0, 1, 0), dir = new Vector3(0, 0, 1)
    const length = safeCameraArm(p, dir, 6.5, 8, 6, [], [{ x: 0, z: 9, radius: 0.5, base: 3, height: 3 }])
    expect(length).toBeLessThan(Math.hypot(14.5, 6)); expect(length).toBeGreaterThan(6.5)
    expect(dir.length()).toBeCloseTo(1)
    expect(p.y + dir.y * length).toBeGreaterThan(3)
  })
  it('blends smoothly across the foliage distance threshold without a sudden camera jump', () => {
    const p = new Vector3(0, 1, 0), dir = new Vector3(0, 0, 1)
    let prev = safeCameraArm(p, dir.set(0, 0, 1), 6.5, 0, 0, [], [{ x: 0, z: 2.3, radius: 0.5, base: 0, height: 5 }])
    for (let z = 2.4; z <= 3.8; z += 0.1) {
      const next = safeCameraArm(p, dir.set(0, 0, 1), 6.5, 0, 0, [], [{ x: 0, z, radius: 0.5, base: 0, height: 5 }])
      expect(Math.abs(next - prev)).toBeLessThan(0.55)
      prev = next
    }
  })
})
