import { describe, expect, it } from 'vitest'
import { CAMP, EAST_COVE_WOODS, EAST_RIDGE_TRAIL, GLEN, GLEN_LAKE_TRAIL, GLEN_PASS, HOLLOW, HOLLOW_PASS, HOLLOW_VALE_TRAIL, LAKE, LAKE_PASS, NORTH_CORRIDOR, OVERLOOK, OVERLOOK_PASS, REEF, REEF_CAUSEWAY, STAR_CLIFF, STAR_PASS, HIGHLAND, VALE, VALE_PASS, WEST_COVE_WOODS, WETLAND, BEACH, clampToRegions, rectDistance, regionDistance, walkableRegions } from './regions'
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
    // Southern coastal woodland loops connect Glen ↔ Beach ↔ Hollow seamlessly from the start, and passes stay wide.
    expect(WEST_COVE_WOODS.maxZ).toBeGreaterThan(GLEN.minZ); expect(WEST_COVE_WOODS.maxX).toBeGreaterThan(BEACH.minX)
    expect(EAST_COVE_WOODS.minX).toBeLessThan(BEACH.maxX); expect(EAST_COVE_WOODS.maxX).toBeGreaterThan(HOLLOW.minX)
    expect(GLEN_PASS.maxZ - GLEN_PASS.minZ).toBeGreaterThanOrEqual(30)
    expect(HOLLOW_PASS.maxZ - HOLLOW_PASS.minZ).toBeGreaterThanOrEqual(20)
    expect(LAKE_PASS.maxZ - LAKE_PASS.minZ).toBeGreaterThanOrEqual(30)
    expect(VALE_PASS.maxZ - VALE_PASS.minZ).toBeGreaterThanOrEqual(30)
    expect(OVERLOOK_PASS.maxZ - OVERLOOK_PASS.minZ).toBeGreaterThanOrEqual(30)
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
