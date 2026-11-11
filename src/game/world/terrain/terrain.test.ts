import { describe, expect, it } from 'vitest'
import { FLAT_EDGE, HILL_HEIGHT, groundColor, heightAt, pathWeight, paths, valueNoise } from './terrain'
import { WORLD_LIMIT } from '../../player/movement'
import { forestTrees, outerTrees } from '../zones/forestLayout'
import { cabin } from '../zones/campLayout'
describe('terrain', () => {
  it('is exactly flat everywhere the player can stand', () => {
    for (let x = -WORLD_LIMIT - 1; x <= WORLD_LIMIT + 1; x += 0.5) for (const z of [-WORLD_LIMIT - 1, -7, 0, 13, WORLD_LIMIT + 1]) {
      expect(heightAt(x, z)).toBe(0); expect(heightAt(z, x)).toBe(0)
    }
  })
  it('rises into bounded hills beyond the boundary', () => {
    expect(heightAt(FLAT_EDGE + 20, 0)).toBeGreaterThan(1)
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
  it('backdrop trees stay outside the play area', () => {
    expect(outerTrees.length).toBeGreaterThan(60)
    for (const t of outerTrees) expect(Math.max(Math.abs(t.x), Math.abs(t.z))).toBeGreaterThan(WORLD_LIMIT + 2)
  })
})
