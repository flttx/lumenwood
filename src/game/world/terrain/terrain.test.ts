import { describe, expect, it } from 'vitest'
import { FLAT_EDGE, HILL_HEIGHT, groundColor, heightAt, pathWeight, paths, valueNoise } from './terrain'
import { OUTER_CLEARANCE, forestTrees, outerTrees } from '../zones/forestLayout'
import { CAMP, GLADE, NORTH_CORRIDOR, regionDistance } from '../regions'
import { sz } from '../scale'
import { cabin } from '../zones/campLayout'
describe('terrain', () => {
  it('the camp and corridor roll gently; the glade stays flat for the light bridge and water', () => {
    for (const r of [CAMP, NORTH_CORRIDOR]) for (let x = r.minX; x <= r.maxX; x += 2) for (let z = r.minZ; z <= r.maxZ; z += 2) {
      const h = heightAt(x, z)
      expect(Math.abs(h)).toBeLessThan(1.6)
      expect(Math.abs(heightAt(x + 1, z) - h)).toBeLessThan(0.35); expect(Math.abs(heightAt(x, z + 1) - h)).toBeLessThan(0.35)
    }
    for (let x = GLADE.minX; x <= GLADE.maxX; x += 1) for (let z = GLADE.minZ; z <= GLADE.maxZ - 2; z += 1) expect(heightAt(x, z)).toBe(0)
  })
  it('the cabin stands on level ground', () => {
    for (const [dx, dz] of [[0, 0], [3, 0], [0, -3], [-3, 3]]) expect(heightAt(cabin.x + dx, cabin.z + dz)).toBe(0)
  })
  it('rises into bounded hills away from the regions, including the ridges beside the corridor', () => {
    expect(heightAt(CAMP.maxX + FLAT_EDGE + 20, 0)).toBeGreaterThan(1)
    expect(heightAt(NORTH_CORRIDOR.maxX + 12, sz(29))).toBeGreaterThan(1) // between camp and wetlands, east of the corridor
    for (let x = CAMP.maxX + 5; x < CAMP.maxX + 60; x += 3) expect(heightAt(x, x * 0.3)).toBeLessThanOrEqual(HILL_HEIGHT)
  })
  it('noise stays in [0, 1] and is deterministic', () => {
    for (let i = 0; i < 200; i++) { const v = valueNoise(i * 0.37, -i * 0.53); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1) }
    expect(valueNoise(3.3, 4.4)).toBe(valueNoise(3.3, 4.4))
  })
  it('paths start at spawn, end at the cabin door and avoid trunks', () => {
    expect(pathWeight(0, 0)).toBe(1)
    const door = paths[0][paths[0].length - 1]
    expect(Math.hypot(door[0] - cabin.x, door[1] - cabin.z)).toBeLessThan(4.5)
    for (const t of forestTrees) expect(pathWeight(t.x, t.z)).toBeLessThan(0.5)
  })
  it('colours are valid and paths read as earth', () => {
    const path = groundColor(0, 0), grass = groundColor(10, 10)
    for (const c of [...path, ...grass]) { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(1) }
    expect(path[0]).toBeGreaterThan(grass[0]) // earth is redder than moss
  })
  it('backdrop trees stay clear of every region, gated corridor included', () => {
    expect(outerTrees.length).toBeGreaterThan(200); expect(outerTrees.length).toBeLessThan(420)
    for (const t of outerTrees) expect(regionDistance(t.x, t.z)).toBeGreaterThanOrEqual(OUTER_CLEARANCE)
  })
  it('the north trail runs through the corridor into the wetlands', () => {
    for (const z of [24, 28, 33].map(sz)) expect(Math.max(...[-5, -4, -3.5, -3, -2].map(x => pathWeight(sz(x), z)))).toBeGreaterThan(0.9)
  })
})
