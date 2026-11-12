import { describe, expect, it } from 'vitest'
import { THICKET_GAP, TREE_GAP, forestTrees, standDensity, trunkRadius } from './forestLayout'
import { CAMP } from '../regions'
// Layout pass 2: the forest has structure (dense stands, open glades), not an even scatter.
describe('forest structure', () => {
  const camp = forestTrees.filter(t => t.x > CAMP.minX && t.x < CAMP.maxX && t.z > CAMP.minZ && t.z < CAMP.maxZ)
  it('big trees crowd the stands and leave the glades open', () => {
    const big = camp.filter(t => t.kind !== 'conifer')
    const inStands = big.filter(t => standDensity(t.x, t.z) > 0.5).length, inGlades = big.filter(t => standDensity(t.x, t.z) < 0.15).length
    expect(inStands).toBeGreaterThan(big.length * 0.6)
    expect(inGlades).toBeLessThan(big.length * 0.08)
  })
  it('keeps a walkable gap between trunks (young conifers may form thickets)', () => {
    for (const [i, a] of forestTrees.entries()) for (const b of forestTrees.slice(i + 1)) {
      const gap = a.kind === 'conifer' && b.kind === 'conifer' ? THICKET_GAP : TREE_GAP
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(trunkRadius(a) + trunkRadius(b) + gap - 1e-9)
    }
  })
})
