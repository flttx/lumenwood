import { describe, expect, it } from 'vitest'
import { FLAT_EDGE, HILL_HEIGHT, groundColor, heightAt, pathWeight, paths, valueNoise } from './terrain'
import { OUTER_CLEARANCE, forestTrees, outerTrees } from '../zones/forestLayout'
import { CAMP, GLADE, NORTH_CORRIDOR, regionDistance } from '../regions'
import { cabin } from '../zones/campLayout'
describe('terrain', () => {
  it('is exactly flat in the camp, the corridor and the glade', () => {
    for (const r of [CAMP, NORTH_CORRIDOR, GLADE]) for (let x = r.minX; x <= r.maxX; x += 0.5) for (let z = r.minZ; z <= r.maxZ; z += 1.5) expect(heightAt(x, z)).toBe(0)
  })
  it('rises into bounded hills away from the regions, including the ridges beside the corridor', () => {
    expect(heightAt(22 + FLAT_EDGE + 20, 0)).toBeGreaterThan(1)
    expect(heightAt(6, 29)).toBeGreaterThan(1) // between camp and wetlands, east of the corridor
    for (let x = 30; x < 70; x += 3) expect(heightAt(x, x * 0.3)).toBeLessThanOrEqual(HILL_HEIGHT)
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
    expect(outerTrees.length).toBeGreaterThan(120); expect(outerTrees.length).toBeLessThan(260)
    for (const t of outerTrees) expect(regionDistance(t.x, t.z)).toBeGreaterThanOrEqual(OUTER_CLEARANCE)
  })
  it('the north trail runs through the corridor into the wetlands', () => {
    for (const z of [24, 28, 33]) expect(Math.max(...[-5, -4, -3.5, -3, -2].map(x => pathWeight(x, z)))).toBeGreaterThan(0.9)
  })
})
