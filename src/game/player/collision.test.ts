import { describe, expect, it } from 'vitest'
import { pushOutOfBox, resolveCollisions } from './collision'
import { PLAYER_RADIUS } from './movement'
import { treeColliders } from '../world/zones/forestLayout'
describe('resolveCollisions', () => {
  it('pushes the player out of a trunk along the contact normal', () => {
    const p = { x: 0.3, z: 0 }
    expect(resolveCollisions(p, 0.35, [{ x: 0, z: 0, radius: 0.4 }])).toBe(true)
    expect(p.x).toBeCloseTo(0.75); expect(p.z).toBe(0)
  })
  it('leaves clear positions untouched and handles exact centre overlap', () => {
    const clear = { x: 2, z: 0 }
    expect(resolveCollisions(clear, 0.35, [{ x: 0, z: 0, radius: 0.4 }])).toBe(false)
    expect(clear).toEqual({ x: 2, z: 0 })
    const centre = { x: 0, z: 0 }
    resolveCollisions(centre, 0.35, [{ x: 0, z: 0, radius: 0.4 }])
    expect(Math.hypot(centre.x, centre.z)).toBeCloseTo(0.75)
  })
  it('settles within 1 cm of every forest trunk, even between adjacent trunks', () => {
    for (const tree of treeColliders) {
      const p = { x: tree.x + 0.05, z: tree.z - 0.05 }
      resolveCollisions(p, PLAYER_RADIUS, treeColliders)
      for (const c of treeColliders) expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeGreaterThanOrEqual(PLAYER_RADIUS + c.radius - 0.01)
    }
  })
  it('keeps the spawn point free', () => { expect(resolveCollisions({ x: 0, z: 0 }, PLAYER_RADIUS, treeColliders)).toBe(false) })
})
describe('pushOutOfBox', () => {
  const box = { x: 10, z: 0, halfX: 2, halfZ: 1, angle: 0 }
  it('pushes out along the face normal and leaves clear points alone', () => {
    const p = { x: 10.5, z: 1.2 }
    expect(pushOutOfBox(p, 0.35, box)).toBe(true)
    expect(p).toEqual({ x: 10.5, z: 1.35 })
    const clear = { x: 10, z: 2 }
    expect(pushOutOfBox(clear, 0.35, box)).toBe(false)
  })
  it('exits a centre inside the box through the nearest face', () => {
    const p = { x: 11.9, z: 0.2 }
    pushOutOfBox(p, 0.35, box)
    expect(p.x).toBeCloseTo(12.35); expect(p.z).toBeCloseTo(0.2)
  })
  it('respects rotation', () => {
    const rotated = { ...box, x: 0, angle: Math.PI / 2 } // local +X now points along world -Z
    const p = { x: 0, z: -2.1 }
    expect(pushOutOfBox(p, 0.35, rotated)).toBe(true)
    expect(p.x).toBeCloseTo(0); expect(p.z).toBeCloseTo(-2.35)
  })
})
