import { describe, expect, it } from 'vitest'
import { createProgress, releaseFirefly, tryLight } from './progress'
import { MAX_REVIVE, REVIVE, reviveCircles } from './revive'
import { lanterns, zoneLanterns } from './routeLayout'
import { flowers } from '../../world/zones/floraLayout'

describe('colour restoration circles', () => {
  const out = new Float32Array(MAX_REVIVE * 4)
  it('a new journey has nothing restored', () => {
    expect(reviveCircles(createProgress(), 10, out)).toEqual({ count: 0, all: 0 })
  })
  it('a woken flower grows a circle with a wavefront that fades once grown', () => {
    const p = createProgress(); releaseFirefly(p, 0, 5)
    reviveCircles(p, 5.4, out)
    expect(out[0]).toBe(flowers[0].x); expect(out[2]).toBeGreaterThan(0); expect(out[2]).toBeLessThan(REVIVE.flowerRadius); expect(out[3]).toBeGreaterThan(0)
    reviveCircles(p, 30, out)
    expect(out[2]).toBeCloseTo(REVIVE.flowerRadius); expect(out[3]).toBe(0)
  })
  it('a completed zone floods its lanterns out to the zone radius', () => {
    const p = createProgress(); p.carried = 99
    zoneLanterns('camp').forEach((i, k) => tryLight(p, i, 0, k))
    const { count } = reviveCircles(p, 100, out)
    expect(count).toBe(3)
    for (let k = 0; k < count; k++) expect(out[k * 4 + 2]).toBeCloseTo(REVIVE.zoneRadius)
  })
  it('the ending restores the whole world', () => {
    const p = createProgress(); p.carried = 99
    lanterns.forEach((_, i) => tryLight(p, i, 0, 1))
    expect(reviveCircles(p, 100, out).all).toBeCloseTo(1)
  })
})
