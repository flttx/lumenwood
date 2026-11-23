import { describe, expect, it } from 'vitest'
import { createProgress } from './progress'
import { advanceConduit, createConduit, facingTree, nextCradle } from './conduit'
import { ANCIENT_TREE } from '../../world/zones/highlandLayout'

describe('highland light conduits', () => {
  it('connects remaining cradles in order without resetting old partial saves', () => {
    const p = createProgress()
    expect(nextCradle(p)).toBe(6); p.litAt[7] = 0
    expect(nextCradle(p)).toBe(6); p.litAt[6] = 1
    expect(nextCradle(p)).toBe(8); p.litAt[8] = 2
    expect(nextCradle(p)).toBe(-1)
  })
  it('never readies on proximity alone, a wrong cradle, missing followers or a wrong heading', () => {
    for (const [near, carried, aligned, held] of [[6, 2, true, false], [7, 2, true, true], [6, 1, true, true], [6, 2, false, true]] as const) {
      const s = createConduit()
      for (let i = 0; i < 30; i++) advanceConduit(s, 0.1, near, 6, carried, aligned, held)
      expect(s.ready).toBe(-1); expect(s.charge).toBe(0)
    }
  })
  it('requires sustained aligned input, decays on interruption and resets when leaving the cradle', () => {
    const s = createConduit()
    for (let i = 0; i < 7; i++) advanceConduit(s, 0.1, 6, 6, 2, true, true)
    expect(s.charge).toBeCloseTo(0.5)
    advanceConduit(s, 0.1, 6, 6, 2, false, true); expect(s.charge).toBeLessThan(0.5)
    for (let i = 0; i < 14; i++) advanceConduit(s, 0.1, 6, 6, 2, true, true)
    expect(s.ready).toBe(6)
    advanceConduit(s, 0.1, -1, 6, 2, true, true); expect(s.ready).toBe(-1); expect(s.charge).toBe(0)
    expect(facingTree(ANCIENT_TREE[0], ANCIENT_TREE[1] - 12, 0, 1)).toBe(true)
    expect(facingTree(ANCIENT_TREE[0], ANCIENT_TREE[1] - 12, 0, -1)).toBe(false)
  })
})
