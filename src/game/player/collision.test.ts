import { describe, expect, it } from 'vitest'
import { resolveCollisions } from './collision'
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
