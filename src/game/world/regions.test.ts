import { describe, expect, it } from 'vitest'
import { CAMP, EAST_RIDGE_TRAIL, GLEN, GLEN_LAKE_TRAIL, HOLLOW, HOLLOW_VALE_TRAIL, LAKE, NORTH_CORRIDOR, OVERLOOK, REEF, REEF_CAUSEWAY, STAR_CLIFF, STAR_PASS, HIGHLAND, VALE, WETLAND, BEACH, clampToRegions, rectDistance, regionDistance, walkableRegions } from './regions'
import { sz } from './scale'
import { paths } from './terrain/terrain'
import { treeColliders } from './zones/forestLayout'
import { PLAYER_RADIUS } from '../player/movement'
describe('walkable regions', () => {
  it('measures distance to rectangles and their union', () => {
    expect(rectDistance(0, 0, CAMP)).toBe(0)
    expect(rectDistance(CAMP.maxX + 3, CAMP.maxZ + 4, CAMP)).toBeCloseTo(5)
    expect(regionDistance(sz(-3.5), sz(30))).toBe(0) // inside the corridor
    expect(regionDistance(sz(10), sz(29))).toBeGreaterThan(5)
  })
  it('the regions connect: main corridors and expansion loops overlap their anchor zones', () => {
    expect(NORTH_CORRIDOR.minZ).toBeLessThan(CAMP.maxZ); expect(NORTH_CORRIDOR.maxZ).toBeGreaterThan(WETLAND.minZ)
    expect(GLEN_LAKE_TRAIL.minZ).toBeLessThan(GLEN.maxZ); expect(GLEN_LAKE_TRAIL.maxZ).toBeGreaterThan(LAKE.minZ)
    expect(HOLLOW_VALE_TRAIL.minZ).toBeLessThan(HOLLOW.maxZ); expect(HOLLOW_VALE_TRAIL.maxZ).toBeGreaterThan(VALE.minZ)
    expect(EAST_RIDGE_TRAIL.minZ).toBeLessThan(VALE.maxZ); expect(EAST_RIDGE_TRAIL.maxZ).toBeGreaterThan(OVERLOOK.minZ)
    expect(REEF_CAUSEWAY.maxZ).toBeGreaterThan(BEACH.minZ); expect(REEF_CAUSEWAY.minZ).toBeLessThan(REEF.maxZ)
    expect(STAR_PASS.minZ).toBeLessThan(HIGHLAND.maxZ); expect(STAR_PASS.maxZ).toBeGreaterThan(STAR_CLIFF.minZ)
  })
  it('a closed gate keeps the player in the camp and blocks gated side loops; an open gate lets them through', () => {
    const x = (NORTH_CORRIDOR.minX + NORTH_CORRIDOR.maxX) / 2, p = { x, z: CAMP.maxZ + 0.6 }
    expect(clampToRegions(p, walkableRegions(false))).toBe(true); expect(p).toEqual({ x, z: CAMP.maxZ })
    const q = { x, z: CAMP.maxZ + 0.6 }
    expect(clampToRegions(q, walkableRegions(true))).toBe(false); expect(q.z).toBe(CAMP.maxZ + 0.6)
    const lx = (GLEN_LAKE_TRAIL.minX + GLEN_LAKE_TRAIL.maxX) / 2, lp = { x: lx, z: GLEN.maxZ + 1 }
    expect(clampToRegions(lp, walkableRegions(false))).toBe(true); expect(lp.z).toBe(GLEN.maxZ)
    expect(clampToRegions({ x: lx, z: GLEN.maxZ + 1 }, walkableRegions(true))).toBe(false)
    const rx = (EAST_RIDGE_TRAIL.minX + EAST_RIDGE_TRAIL.maxX) / 2, rp = { x: rx, z: VALE.maxZ + 1 }
    expect(clampToRegions(rp, walkableRegions(true, true, false))).toBe(true); expect(rp.z).toBe(VALE.maxZ)
    expect(clampToRegions({ x: rx, z: VALE.maxZ + 1 }, walkableRegions(true, true, true))).toBe(false)
  })
  it('clamps to the nearest region and slides along the corridor walls', () => {
    const p = { x: NORTH_CORRIDOR.maxX + 0.4, z: sz(30) }
    clampToRegions(p, walkableRegions(true)); expect(p).toEqual({ x: NORTH_CORRIDOR.maxX, z: sz(30) })
    const q = { x: CAMP.maxX + 5, z: CAMP.minZ + 10 } // east of the camp, south of the hollow's pass
    clampToRegions(q, walkableRegions(false)); expect(q).toEqual({ x: CAMP.maxX, z: CAMP.minZ + 10 })
  })
  it('no trunk stands on the north trail, so the way into the corridor is always open', () => {
    const north = paths[1]
    for (let i = 1; i < north.length; i++) for (let t = 0; t <= 1; t += 0.05) {
      const x = north[i - 1][0] + (north[i][0] - north[i - 1][0]) * t, z = north[i - 1][1] + (north[i][1] - north[i - 1][1]) * t
      for (const c of treeColliders) expect(Math.hypot(x - c.x, z - c.z)).toBeGreaterThan(c.radius + PLAYER_RADIUS)
    }
  })
})
