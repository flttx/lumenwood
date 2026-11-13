import { journeyBlend } from './timeOfDay'
import { describe, expect, it } from 'vitest'
import { applyZoneTint, blendPresets, highlandTints, presets, wetlandTints } from './timeOfDay'
describe('blendPresets', () => {
  it('returns the presets at the ends and clamps outside', () => {
    expect(blendPresets(0)).toEqual(presets.day)
    expect(blendPresets(1)).toEqual(presets.twilight)
    expect(blendPresets(-1)).toEqual(presets.day)
    expect(blendPresets(2)).toEqual(presets.night)
    expect(blendPresets(3)).toEqual(presets.night)
    expect(blendPresets(1.5).sunIntensity).toBeCloseTo((presets.twilight.sunIntensity + presets.night.sunIntensity) / 2)
  })
  it('interpolates numbers linearly and colours per channel', () => {
    const mid = blendPresets(0.5)
    expect(mid.sunIntensity).toBeCloseTo((presets.day.sunIntensity + presets.twilight.sunIntensity) / 2)
    const r = (c: number) => (c >> 16) & 255
    expect(r(mid.skyTop)).toBe(Math.round((r(presets.day.skyTop) + r(presets.twilight.skyTop)) / 2))
  })
})
describe('applyZoneTint', () => {
  it('leaves the camp untouched and fully adopts the wetland look at k = 1', () => {
    expect(applyZoneTint(blendPresets(1), wetlandTints, 0, 1)).toEqual(presets.twilight)
    const full = applyZoneTint(blendPresets(1), wetlandTints, 1, 1)
    expect(full.fog).toBe(wetlandTints.twilight.fog); expect(full.fogFar).toBeCloseTo(wetlandTints.twilight.fogFar)
    expect(full.sunIntensity).toBe(presets.twilight.sunIntensity) // only fog and horizon change
  })
  it('the highlands see further than the camp', () => {
    expect(applyZoneTint(blendPresets(0), highlandTints, 1, 0).fogFar).toBeGreaterThan(presets.day.fogFar)
  })
})

describe('journey time', () => {
  it('afternoon in the camp, dusk in the wetlands, night on the highland and full night at the end', () => {
    expect(journeyBlend(0, 0)).toBe(0)
    expect(journeyBlend(3, 0)).toBeCloseTo(1 / 3) // camp lit: late afternoon
    const wetland = journeyBlend(3, 1)
    expect(wetland).toBeGreaterThan(0.8); expect(wetland).toBeLessThan(1.1) // dusk
    expect(journeyBlend(6, 1, 1)).toBeGreaterThan(1.5) // the highland is night
    expect(journeyBlend(9, 0, 1)).toBe(2)
  })
})
