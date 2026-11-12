import { describe, expect, it } from 'vitest'
import { GATE_DELAY, createProgress, gateOpen, reachFinale, releaseFirefly, tryLight } from './progress'
import { LANTERN_COST, LANTERN_RANGE, lanternPlacements, lanterns, zoneLanterns } from './routeLayout'
import { glowFlowers } from '../../world/zones/campLayout'
import { flowers } from '../../world/zones/floraLayout'
import { basinDepth } from '../../world/zones/wetlandLayout'
import { treeColliders } from '../../world/zones/forestLayout'
import { pathWeight } from '../../world/terrain/terrain'
import { PLAYER_RADIUS } from '../../player/movement'

describe('route progress', () => {
  it('each flower releases one firefly, once', () => {
    const p = createProgress()
    expect(releaseFirefly(p, 0)).toBe(true); expect(releaseFirefly(p, 0)).toBe(false); expect(releaseFirefly(p, 3)).toBe(true)
    expect(p.carried).toBe(2)
  })
  it('lights a lantern only up close and with enough fireflies, spending them', () => {
    const p = createProgress()
    releaseFirefly(p, 0)
    expect(tryLight(p, 0, 1, 0)).toBe('short'); expect(p.shortAt[0]).toBe(0)
    releaseFirefly(p, 1)
    expect(tryLight(p, 0, LANTERN_RANGE + 0.1, 0)).toBe('none')
    expect(tryLight(p, 0, 1, 5)).toBe('lit')
    expect(p.carried).toBe(2 - LANTERN_COST); expect(p.litAt[0]).toBe(5)
    expect(tryLight(p, 0, 1, 6)).toBe('none') // already lit
  })
  it('completes the camp route when every camp lantern is lit, in any order', () => {
    const p = createProgress(), camp = zoneLanterns('camp')
    glowFlowers.forEach((_, i) => releaseFirefly(p, i))
    ;[...camp].reverse().forEach((i, n) => { expect(p.completedAt.camp).toBeNull(); expect(tryLight(p, i, 0.5, n)).toBe('lit') })
    expect(p.completedAt.camp).toBe(camp.length - 1)
  })
  it('each zone has exactly enough flowers for its lanterns', () => {
    expect(glowFlowers.length).toBe(zoneLanterns('camp').length * LANTERN_COST)
    expect(flowers.filter(f => f.zone === 'wetland').length).toBe(zoneLanterns('wetland').length * LANTERN_COST)
  })
})

describe('route layout', () => {
  it('lanterns stand on dry ground beside the trail, clear of trunks and flowers', () => {
    for (const l of lanterns) {
      expect(pathWeight(l.x, l.z)).toBeLessThan(0.5) // not on the trail itself
      expect(basinDepth(l.x, l.z)).toBe(0) // never in water
      for (const f of flowers) expect(Math.hypot(l.x - f.x, l.z - f.z)).toBeGreaterThan(LANTERN_RANGE) // a flower itself is never within a lantern's reach
      for (const t of treeColliders) expect(Math.hypot(l.x - t.x, l.z - t.z) - t.radius).toBeGreaterThan(1.2 + PLAYER_RADIUS)
    }
  })
  it('each lantern hangs over its trail, 0.19 m out from the post', () => {
    for (const l of lanternPlacements.filter(l => l.kind === 'post')) {
      expect(Math.hypot(l.light[0] - l.x, l.light[2] - l.z)).toBeCloseTo(0.19)
      expect(pathWeight(l.light[0], l.light[2])).toBeGreaterThanOrEqual(pathWeight(l.x, l.z))
    }
  })
})
describe('gate timing', () => {
  it('opens a zone gate only after the stream has travelled', () => {
    const p = createProgress()
    expect(gateOpen(p, 'camp', 100)).toBe(false)
    p.completedAt.camp = 10
    expect(gateOpen(p, 'camp', 10 + GATE_DELAY - 0.01)).toBe(false); expect(gateOpen(p, 'camp', 10 + GATE_DELAY)).toBe(true)
  })
})
describe('finale', () => {
  it('fires once, the first time the player stands in the glade', () => {
    const p = createProgress()
    expect(reachFinale(p, false, 1)).toBe(false)
    expect(reachFinale(p, true, 2)).toBe(true); expect(p.finaleAt).toBe(2)
    expect(reachFinale(p, true, 3)).toBe(false)
  })
})
