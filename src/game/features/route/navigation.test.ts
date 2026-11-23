import { describe, expect, it } from 'vitest'
import { flowers } from '../../world/zones/floraLayout'
import { ASCENT, BRIDGE, CAMP, GLEN, GLEN_PASS, HIGHLAND, LAKE_PASS, NORTH_CORRIDOR, WETLAND, rectDistance } from '../../world/regions'
import { createProgress, releaseFirefly, tryLight, type RouteProgress } from './progress'
import { directionLabel, routeObjective, targetBearing } from './navigation'
import { zoneLanterns, type Zone } from './routeLayout'

function finish(p: RouteProgress, zone: Zone, now = 0) {
  flowers.forEach((f, i) => { if (f.zone === zone) releaseFirefly(p, i) })
  zoneLanterns(zone).forEach(i => tryLight(p, i, 0, now))
}
describe('persistent route guidance', () => {
  it('starts at the visible flower, explains the cost, then switches from flowers to a lantern', () => {
    const p = createProgress(), first = routeObjective(p, 0, 0, 0)
    expect(first.target).toMatchObject({ x: flowers[0].x, z: flowers[0].z })
    expect(first.detail).toContain('2 朵花')
    releaseFirefly(p, 0)
    expect(routeObjective(p, 0, 0, 1).detail).toContain('1 朵花')
    releaseFirefly(p, 1)
    expect(routeObjective(p, 0, 0, 2).id).toMatch(/^lantern-/)
    expect(routeObjective(p, 0, 0, 2).detail).toContain('自动点亮')
  })
  it('keeps a selected flower while walking, and stops directing players to it once collected', () => {
    const p = createProgress(), first = routeObjective(p, 0, 0, 0)
    const f = flowers[1]
    expect(routeObjective(p, f.x, f.z, 1, first.id).id).toBe(first.id)
    releaseFirefly(p, 0)
    expect(routeObjective(p, f.x, f.z, 2, first.id).id).not.toBe(first.id)
  })
  it('points through the corridor entrance before its exit and explains the opening delay', () => {
    const p = createProgress(); finish(p, 'camp', 10)
    const waiting = routeObjective(p, 0, 0, 11)
    expect(waiting.title).toContain('迷雾')
    expect(waiting.target!.z).toBeLessThan(CAMP.maxZ)
    const entrance = routeObjective(p, 20, 40, 15).target!
    expect(rectDistance(entrance.x, entrance.z, NORTH_CORRIDOR)).toBe(0)
    expect(entrance.z).toBeLessThan(WETLAND.minZ)
    const exit = routeObjective(p, entrance.x, entrance.z, 16).target!
    expect(rectDistance(exit.x, exit.z, WETLAND)).toBe(0)
  })
  it('shows the remaining wetland lantern count rather than the global count', () => {
    const p = createProgress(); finish(p, 'camp')
    flowers.forEach((f, i) => { if (f.zone === 'wetland') releaseFirefly(p, i) })
    zoneLanterns('wetland').slice(0, 2).forEach(i => tryLight(p, i, 0, 5))
    const o = routeObjective(p, -12, 125, 10)
    expect(o.progress).toContain('灯火 2/3')
    expect(o.id).toBe(`lantern-${zoneLanterns('wetland')[2]}`)
  })
  it('uses the light bridge before pointing at the highland ramp', () => {
    const p = createProgress(); finish(p, 'camp'); finish(p, 'wetland', 10)
    expect(routeObjective(p, -20, 145, 11).title).toContain('正在铺成光桥')
    const o = routeObjective(p, -20, 145, 15)
    expect(o.id).toBe('to-glade')
    expect(rectDistance(o.target!.x, o.target!.z, BRIDGE)).toBe(0)
    p.finaleAt = 20
    expect(routeObjective(p, -10, 178, 21).title).toContain('正在打开')
    const ramp = routeObjective(p, -10, 178, 25)
    expect(rectDistance(ramp.target!.x, ramp.target!.z, ASCENT)).toBe(0)
    expect(ramp.target!.z).toBeLessThan(HIGHLAND.minZ)
  })
  it('returns from the glen via its pass instead of aiming through the enclosing hillside', () => {
    const p = createProgress(), o = routeObjective(p, -120, -20, 0)
    expect(o.id).toBe('return-main')
    expect(o.target!.x).toBeLessThan(GLEN.maxX)
    expect(o.target!.z).toBeGreaterThan(GLEN_PASS.minZ)
    expect(o.target!.z).toBeLessThan(GLEN_PASS.maxZ)
    const exit = routeObjective(p, o.target!.x, o.target!.z, 1)
    expect(exit.target!.x).toBeGreaterThan(CAMP.minX)
  })
  it('returns from the mirror lake through the lake pass', () => {
    const p = createProgress(); finish(p, 'camp')
    const o = routeObjective(p, -110, 140, 10)
    expect(o.target!.z).toBeGreaterThan(LAKE_PASS.minZ)
    expect(o.target!.z).toBeLessThan(LAKE_PASS.maxZ)
  })
  it('ends mandatory guidance after the ancient tree is lit', () => {
    const p = createProgress(); finish(p, 'camp'); finish(p, 'wetland'); finish(p, 'highland')
    p.seedsAt.set(0, 0)
    const o = routeObjective(p, 0, 0, 100)
    expect(o.target).toBeNull(); expect(o.title).toContain('自由探索'); expect(o.progress).toContain('1/12')
  })
  it('keeps screen-relative arrow directions correct when the camera turns', () => {
    expect(targetBearing(0, -10, 0, -1)).toBe(0)
    expect(targetBearing(10, 0, 0, -1)).toBe(90)
    expect(targetBearing(-10, 0, 0, -1)).toBe(-90)
    expect(directionLabel(targetBearing(0, -10, 0, 1))).toContain('身后')
    expect(targetBearing(0, -10, 1, 0)).toBe(-90)
  })
})
