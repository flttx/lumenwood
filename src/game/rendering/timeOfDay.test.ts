import { describe, expect, it } from 'vitest'
import { applyWetlandTint, blendPresets, presets, wetlandTints } from './timeOfDay'
describe('blendPresets', () => {
  it('returns the presets at the ends and clamps outside', () => {
    expect(blendPresets(0)).toEqual(presets.day)
    expect(blendPresets(1)).toEqual(presets.twilight)
    expect(blendPresets(-1)).toEqual(presets.day)
    expect(blendPresets(2)).toEqual(presets.twilight)
  })
  it('interpolates numbers linearly and colours per channel', () => {
    const mid = blendPresets(0.5)
    expect(mid.sunIntensity).toBeCloseTo((presets.day.sunIntensity + presets.twilight.sunIntensity) / 2)
    const r = (c: number) => (c >> 16) & 255
    expect(r(mid.skyTop)).toBe(Math.round((r(presets.day.skyTop) + r(presets.twilight.skyTop)) / 2))
  })
})
describe('applyWetlandTint', () => {
  it('leaves the camp untouched and fully adopts the wetland look at k = 1', () => {
    expect(applyWetlandTint(blendPresets(1), 0, 1)).toEqual(presets.twilight)
    const full = applyWetlandTint(blendPresets(1), 1, 1)
    expect(full.fog).toBe(wetlandTints.twilight.fog); expect(full.fogFar).toBeCloseTo(wetlandTints.twilight.fogFar)
    expect(full.sunIntensity).toBe(presets.twilight.sunIntensity) // only fog and horizon change
  })
})
