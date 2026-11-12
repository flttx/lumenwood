import { describe, expect, it } from 'vitest'
import { hintTarget, zoneAt } from './guide'
import { createProgress, releaseFirefly, tryLight } from './progress'
import { lanterns, routeEnds, zoneLanterns } from './routeLayout'
import { flowers } from '../../world/zones/floraLayout'

describe('guidance', () => {
  it('knows the zone from how far north the player is', () => {
    expect(zoneAt(0)).toBe('camp'); expect(zoneAt(40)).toBe('wetland'); expect(zoneAt(70)).toBe('wetland'); expect(zoneAt(110)).toBe('highland')
  })
  it('points to a sleeping flower first, then to a dark lantern once enough fireflies follow', () => {
    const p = createProgress()
    const first = hintTarget(p, 0, 0)!
    expect(flowers.some(f => f.zone === 'camp' && f.x === first.x && f.z === first.z)).toBe(true)
    releaseFirefly(p, 0); releaseFirefly(p, 1)
    const next = hintTarget(p, 0, 0)!
    expect(lanterns.some(l => l.zone === 'camp' && l.x === next.x && l.z === next.z)).toBe(true)
  })
  it('points onward once the zone is done, and at nothing after the ending', () => {
    const p = createProgress()
    flowers.forEach((_, i) => releaseFirefly(p, i))
    zoneLanterns('camp').forEach(i => tryLight(p, i, 0, 1))
    expect(hintTarget(p, 0, 0)).toEqual({ x: routeEnds.camp[0], z: routeEnds.camp[1] })
    zoneLanterns('highland').forEach(i => tryLight(p, i, 0, 2))
    expect(hintTarget(p, -4, 110)).toBeNull()
  })
})
