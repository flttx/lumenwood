import { describe, expect, it } from 'vitest'
import { CHANNEL, DEEP_DEPTH, SHALLOW_DEPTH, deepPoolColliders, pools, wetlandPath } from './wetlandLayout'
import { flowers } from './floraLayout'
import { WETLAND_TREE_COUNT, treeColliders, wetlandTrees } from './forestLayout'
import { BRIDGE, GLADE, WETLAND, clampToRegions, rectDistance, walkableRegions } from '../regions'
import { heightAt, nearestPathPoint } from '../terrain/terrain'
import { PLAYER_RADIUS } from '../../player/movement'
const blocked = (x: number, z: number) => deepPoolColliders.some(c => Math.hypot(x - c.x, z - c.z) < c.radius + PLAYER_RADIUS)

describe('wetland layout', () => {
  it('wherever the player can stand, the water is at most wading depth', () => {
    for (let x = WETLAND.minX; x <= WETLAND.maxX; x += 0.4) for (let z = WETLAND.minZ; z <= WETLAND.maxZ; z += 0.4) {
      if (blocked(x, z)) continue
      const h = heightAt(x, z)
      expect(h).toBeLessThanOrEqual(0); expect(h).toBeGreaterThanOrEqual(SHALLOW_DEPTH - 0.02)
    }
  })
  it('has both wading pools and deep water, and the channel is deep under the bridge', () => {
    expect(pools.some(p => !p.deep) && pools.some(p => p.deep)).toBe(true)
    expect(heightAt(-3.5, (CHANNEL.minZ + CHANNEL.maxZ) / 2)).toBeCloseTo(DEEP_DEPTH)
  })
  it('the trail from the corridor to the bridge is walkable and avoids deep water', () => {
    for (let i = 1; i < wetlandPath.length; i++) for (let t = 0; t <= 1; t += 0.05) {
      const [ax, az] = wetlandPath[i - 1], [bx, bz] = wetlandPath[i], x = ax + (bx - ax) * t, z = az + (bz - az) * t
      expect(blocked(x, z)).toBe(false)
      for (const c of treeColliders) expect(Math.hypot(x - c.x, z - c.z)).toBeGreaterThan(c.radius + PLAYER_RADIUS)
    }
    expect(rectDistance(...wetlandPath[wetlandPath.length - 1], BRIDGE)).toBe(0) // ends on the bridge
  })
  it('the glade is only reachable over the bridge', () => {
    const p = { x: -3.5, z: 63.5 }
    clampToRegions(p, walkableRegions(true, false)); expect(p.z).toBe(WETLAND.maxZ)
    const q = { x: -3.5, z: 63.5 }
    expect(clampToRegions(q, walkableRegions(true, true))).toBe(false)
  })
  it('wetland and glade flowers grow on dry ground, clear of deep water', () => {
    for (const f of flowers.filter(f => f.zone === 'wetland' || f.zone === 'glade')) {
      expect(heightAt(f.x, f.z)).toBe(0); expect(blocked(f.x, f.z)).toBe(false)
      if (f.zone === 'glade') expect(rectDistance(f.x, f.z, GLADE)).toBe(0)
    }
  })
  it('places every wetland tree on dry ground', () => {
    expect(wetlandTrees.length).toBe(WETLAND_TREE_COUNT)
    for (const t of wetlandTrees) { expect(rectDistance(t.x, t.z, WETLAND)).toBe(0); expect(heightAt(t.x, t.z)).toBe(0); expect(nearestPathPoint(t.x, t.z).distance).toBeGreaterThan(2) }
  })
})
