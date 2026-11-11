import { describe, expect, it } from 'vitest'
import { FIREFLY_COUNT, fireflyHomes, random } from './swarm'
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
})
