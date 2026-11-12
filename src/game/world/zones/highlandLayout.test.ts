import { describe, expect, it } from 'vitest'
import { ANCIENT_TREE, PLATEAU_HEIGHT, TREE_ROOT_RADIUS, cradleSpots, elevation, highlandPath, treeCollider } from './highlandLayout'
import { flowers } from './floraLayout'
import { CAMP_TREE_COUNT, HIGHLAND_TREE_COUNT, WETLAND_TREE_COUNT, forestTrees, highlandRocks, rockColliders, treeColliders } from './forestLayout'
import { ASCENT, GLADE, HIGHLAND, clampToRegions, rectDistance, walkableRegions } from '../regions'
import { heightAt } from '../terrain/terrain'
import { PLAYER_RADIUS } from '../../player/movement'
import { LANTERN_COST, lanternColliders, zoneLanterns } from '../../features/route/routeLayout'
const solid = [...treeColliders, ...rockColliders, ...lanternColliders, treeCollider]
const blocked = (x: number, z: number) => solid.some(c => Math.hypot(x - c.x, z - c.z) < c.radius + PLAYER_RADIUS)

describe('highland layout', () => {
  it('the plateau rolls gently around PLATEAU_HEIGHT and the glade stays at 0', () => {
    for (let x = HIGHLAND.minX; x <= HIGHLAND.maxX; x += 2) for (let z = HIGHLAND.minZ; z <= HIGHLAND.maxZ; z += 2) expect(Math.abs(heightAt(x, z) - PLATEAU_HEIGHT)).toBeLessThan(1.6)
    expect(heightAt(ANCIENT_TREE[0] + 6, ANCIENT_TREE[1])).toBeCloseTo(PLATEAU_HEIGHT, 6) // the tree stands on a level pad
    expect(elevation(GLADE.maxZ)).toBe(0)
  })
  it('the ramp climbs steadily from the glade to the plateau', () => {
    let previous = heightAt((ASCENT.minX + ASCENT.maxX) / 2, ASCENT.minZ)
    for (let z = ASCENT.minZ; z <= ASCENT.maxZ; z += 0.5) {
      const h = heightAt((ASCENT.minX + ASCENT.maxX) / 2, z)
      expect(h).toBeGreaterThan(previous - 0.05); expect(h - previous).toBeLessThan(0.3) // climbs (small swells allowed), never steeper than ~31°
      previous = h
    }
  })
  it('the ramp opens only with its gate', () => {
    const x = (ASCENT.minX + ASCENT.maxX) / 2, z = GLADE.maxZ + 8, p = { x, z }
    clampToRegions(p, walkableRegions(true, true, false)); expect(p.z).toBe(GLADE.maxZ)
    expect(clampToRegions({ x, z }, walkableRegions(true, true, true))).toBe(false)
  })
  it('the trail from the glade to the tree is never blocked', () => {
    for (let i = 1; i < highlandPath.length; i++) for (let t = 0; t <= 1; t += 0.05) {
      const [ax, az] = highlandPath[i - 1], [bx, bz] = highlandPath[i]
      expect(blocked(ax + (bx - ax) * t, az + (bz - az) * t)).toBe(false)
    }
  })
  it('cradles and flowers stand on the plateau, outside the roots, reachable on foot', () => {
    for (const [x, z] of cradleSpots) {
      expect(rectDistance(x, z, HIGHLAND)).toBe(0)
      expect(Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1])).toBeGreaterThan(TREE_ROOT_RADIUS + 2)
    }
    for (const f of flowers.filter(f => f.zone === 'highland')) {
      expect(rectDistance(f.x, f.z, HIGHLAND)).toBe(0); expect(blocked(f.x, f.z)).toBe(false)
      for (const [x, z] of cradleSpots) expect(Math.hypot(f.x - x, f.z - z)).toBeGreaterThan(2.3)
    }
    expect(flowers.filter(f => f.zone === 'highland').length).toBe(zoneLanterns('highland').length * LANTERN_COST)
  })
  it('places plateau trees and rocks clear of the tree', () => {
    const cap = CAMP_TREE_COUNT + WETLAND_TREE_COUNT + HIGHLAND_TREE_COUNT
    expect(forestTrees.length).toBeGreaterThan(cap * 0.85); expect(forestTrees.length).toBeLessThanOrEqual(cap)
    expect(highlandRocks.length).toBeGreaterThan(12)
    for (const r of highlandRocks.slice(6)) expect(Math.hypot(r.x - ANCIENT_TREE[0], r.z - ANCIENT_TREE[1])).toBeGreaterThan(12)
  })
})
