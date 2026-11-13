import { describe, expect, it } from 'vitest'
import { CAMP, NORTH_CORRIDOR, WETLAND, clampToRegions, rectDistance, regionDistance, walkableRegions } from './regions'
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
  it('the regions connect: the corridor overlaps both the camp and the wetlands', () => {
    expect(NORTH_CORRIDOR.minZ).toBeLessThan(CAMP.maxZ); expect(NORTH_CORRIDOR.maxZ).toBeGreaterThan(WETLAND.minZ)
  })
  it('a closed gate keeps the player in the camp; an open gate lets them through', () => {
    const x = (NORTH_CORRIDOR.minX + NORTH_CORRIDOR.maxX) / 2, p = { x, z: CAMP.maxZ + 0.6 }
    expect(clampToRegions(p, walkableRegions(false))).toBe(true); expect(p).toEqual({ x, z: CAMP.maxZ })
    const q = { x, z: CAMP.maxZ + 0.6 }
    expect(clampToRegions(q, walkableRegions(true))).toBe(false); expect(q.z).toBe(CAMP.maxZ + 0.6)
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
