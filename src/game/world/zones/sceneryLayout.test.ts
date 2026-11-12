import { describe, expect, it } from 'vitest'
import { BRIDGE_BASE, BRIDGE_HALF, bridgeRailColliders, deckHeight, fenceColliders, ferns, footbridges, logColliders, mossStones, mushrooms } from './sceneryLayout'
import { SPAWN_CLEARING } from './forestLayout'
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
  it('footbridge decks meet the bank at both ends and the railings leave the deck walkable', () => {
    for (const b of footbridges) {
      const cos = Math.cos(b.angle), sin = Math.sin(b.angle)
      for (const end of [-1, 1]) {
        const along = end * (BRIDGE_HALF[0] - 0.01)
        expect(deckHeight(b.x + cos * along, b.z - sin * along)).toBeCloseTo(BRIDGE_BASE + -BRIDGE_BASE, 2) // flush with the flat bank
      }
      for (let along = -BRIDGE_HALF[0]; along <= BRIDGE_HALF[0]; along += 0.25) {
        const p = { x: b.x + cos * along, z: b.z - sin * along }
        for (const rail of bridgeRailColliders) expect(pushOutOfBox(p, PLAYER_RADIUS, rail)).toBe(false)
      }
    }
  })
  it('no fallen log lies in the spawn clearing', () => {
    for (const log of logColliders) expect(Math.hypot(log.x, log.z)).toBeGreaterThan(SPAWN_CLEARING + 3 - 1e-9)
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
