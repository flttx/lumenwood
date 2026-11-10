import { describe, expect, it } from 'vitest'
import { LOD1_DISTANCE, LOD_HYSTERESIS, selectLod } from './treeLod'
describe('selectLod', () => {
  it('uses LOD0 near and LOD1 far', () => {
    expect(selectLod(2, 1)).toBe(0)
    expect(selectLod(LOD1_DISTANCE + LOD_HYSTERESIS + 1, 0)).toBe(1)
  })
  it('keeps the current LOD inside the hysteresis band', () => {
    expect(selectLod(LOD1_DISTANCE + 1, 0)).toBe(0)
    expect(selectLod(LOD1_DISTANCE - 1, 1)).toBe(1)
    expect(selectLod(LOD1_DISTANCE, 0)).toBe(0)
    expect(selectLod(LOD1_DISTANCE, 1)).toBe(1)
  })
})
