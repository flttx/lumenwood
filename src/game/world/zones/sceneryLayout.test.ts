import { describe, expect, it } from 'vitest'
import { deckHeight, fenceColliders, ferns, footbridges, logColliders, mossStones, mushrooms } from './sceneryLayout'
import { basinDepth, pools, WATER_LEVEL } from './wetlandLayout'
import { paths, pathWeight } from '../terrain/terrain'
import { PLAYER_RADIUS } from '../../player/movement'
import { pushOutOfBox } from '../../player/collision'

describe('scenery layout', () => {
  it('footbridges span their brooks, and the deck keeps the player above the water', () => {
    expect(footbridges.length).toBe(2)
    for (const b of footbridges) {
      expect(pools.some(p => !p.deep && Math.hypot(p.x - b.x, p.z - b.z) < 0.01)).toBe(true) // centred on a brook
      expect(deckHeight(b.x, b.z)).toBeGreaterThan(WATER_LEVEL + 0.4)
    }
    expect(deckHeight(0, 0)).toBe(-Infinity)
  })
  it('undergrowth never grows on a trail or in water', () => {
    for (const s of [...ferns, ...mossStones, ...mushrooms]) { expect(pathWeight(s.x, s.z)).toBeLessThanOrEqual(0.25); expect(basinDepth(s.x, s.z)).toBe(0) }
    expect(ferns.length).toBeGreaterThan(800)
  })
  it('fallen logs and fences never block a trail', () => {
    for (const path of paths) for (let i = 1; i < path.length; i++) for (let t = 0; t <= 1; t += 0.02) {
      const x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, z = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t
      for (const box of [...logColliders, ...fenceColliders]) expect(pushOutOfBox({ x, z }, PLAYER_RADIUS, box)).toBe(false)
    }
  })
})
