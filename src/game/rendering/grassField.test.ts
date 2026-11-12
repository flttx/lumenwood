import { describe, expect, it } from 'vitest'
import { bakeGrassField, grassDensity } from './grassField'
import { heightAt } from '../world/terrain/terrain'
import { pools } from '../world/zones/wetlandLayout'
describe('grass field', () => {
  it('no grass on the trail or in water, full grass in open forest floor', () => {
    expect(grassDensity(0, 0)).toBeLessThan(0.05) // spawn sits on the trail
    const pool = pools[0]
    expect(grassDensity(pool.x, pool.z)).toBe(0)
    expect(grassDensity(15, 8)).toBeGreaterThan(0.9)
  })
  it('clearings cut grass out around structures', () => {
    expect(grassDensity(15, 8, [{ x: 15, z: 8, r: 2 }])).toBe(0)
  })
  it('bakes height and density per cell', () => {
    const f = bakeGrassField([], 4)
    expect(f.data.length).toBe(f.width * f.depth * 4)
    const i = Math.round((15 - f.minX) / f.cell), j = Math.round((8 - f.minZ) / f.cell), k = (j * f.width + i) * 4
    expect(f.data[k]).toBeCloseTo(heightAt(f.minX + i * f.cell, f.minZ + j * f.cell))
  })
})
