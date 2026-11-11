import { describe, expect, it } from 'vitest'
import { CAMP, NORTH_CORRIDOR, WETLAND, clampToRegions, rectDistance, regionDistance, walkableRegions } from './regions'
import { treeColliders } from './zones/forestLayout'
import { PLAYER_RADIUS } from '../player/movement'
describe('walkable regions', () => {
  it('measures distance to rectangles and their union', () => {
    expect(rectDistance(0, 0, CAMP)).toBe(0)
    expect(rectDistance(25, 26, CAMP)).toBeCloseTo(5)
    expect(regionDistance(-3.5, 30)).toBe(0) // inside the corridor
    expect(regionDistance(10, 29)).toBeGreaterThan(5)
  })
  it('the regions connect: the corridor overlaps both the camp and the wetlands', () => {
    expect(NORTH_CORRIDOR.minZ).toBeLessThan(CAMP.maxZ); expect(NORTH_CORRIDOR.maxZ).toBeGreaterThan(WETLAND.minZ)
  })
  it('a closed gate keeps the player in the camp; an open gate lets them through', () => {
    const p = { x: -3.5, z: 22.6 }
    expect(clampToRegions(p, walkableRegions(false))).toBe(true); expect(p).toEqual({ x: -3.5, z: 22 })
    const q = { x: -3.5, z: 22.6 }
    expect(clampToRegions(q, walkableRegions(true))).toBe(false); expect(q.z).toBe(22.6)
  })
  it('clamps to the nearest region and slides along the corridor walls', () => {
    const p = { x: -1, z: 30 }
    clampToRegions(p, walkableRegions(true)); expect(p).toEqual({ x: -1.4, z: 30 })
    const q = { x: 30, z: -30 }
    clampToRegions(q, walkableRegions(false)); expect(q).toEqual({ x: 22, z: -22 })
  })
  it('the trail into the corridor is passable: trunks 13 and 34 frame the mouth without blocking it', () => {
    // A player walking straight up the trail end (x = -3.3) from z = 17 into the corridor.
    const lane = { minX: -3.3, maxX: -3.3, minZ: 17, maxZ: 24 }
    for (const t of treeColliders) expect(rectDistance(t.x, t.z, lane)).toBeGreaterThan(t.radius + PLAYER_RADIUS)
    expect(lane.minX).toBeGreaterThan(NORTH_CORRIDOR.minX); expect(lane.maxX).toBeLessThan(NORTH_CORRIDOR.maxX)
  })
})
