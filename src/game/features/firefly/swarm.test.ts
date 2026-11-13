import { describe, expect, it } from 'vitest'
import { FIREFLY_COUNT, WETLAND_FIREFLY_COUNT, fireflyHomes, random, wetlandFireflyHomes } from './swarm'
import { LAKE, WETLAND } from '../../world/regions'
import { WORLD_LIMIT } from '../../player/movement'
describe('fireflies', () => {
  it('random is deterministic and in [0, 1)', () => {
    const a = random(3), b = random(3)
    for (let i = 0; i < 50; i++) { const v = a(); expect(v).toBe(b()); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
  })
  it('places every firefly above ground inside the camp', () => {
    const homes = fireflyHomes()
    expect(homes.length).toBe(FIREFLY_COUNT * 3)
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      expect(Math.abs(homes[i * 3])).toBeLessThan(WORLD_LIMIT + 3)
      expect(homes[i * 3 + 1]).toBeGreaterThan(0.25)
      expect(Math.abs(homes[i * 3 + 2])).toBeLessThan(WORLD_LIMIT + 3)
    }
  })
  it('places wetland fireflies above the wetlands', () => {
    const homes = wetlandFireflyHomes()
    expect(homes.length).toBe(WETLAND_FIREFLY_COUNT * 3)
    for (let i = 0; i < WETLAND_FIREFLY_COUNT; i++) {
      expect(homes[i * 3]).toBeGreaterThan(LAKE.minX - 3); expect(homes[i * 3]).toBeLessThan(WETLAND.maxX + 3)
      expect(homes[i * 3 + 2]).toBeGreaterThan(Math.min(WETLAND.minZ, LAKE.minZ) - 3); expect(homes[i * 3 + 2]).toBeLessThan(WETLAND.maxZ + 3)
      expect(homes[i * 3 + 1]).toBeGreaterThan(0.2)
    }
  })
})
