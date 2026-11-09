import { describe, expect, it } from 'vitest'
import { estimateCredits } from './meshyPricing'
describe('estimateCredits', () => {
  it('matches the published Image to 3D prices', () => {
    expect(estimateCredits({ ai_model: 'meshy-7.1', should_texture: true, texture_resolution: '2k' })).toBe(30)
    expect(estimateCredits({ ai_model: 'meshy-7.1', should_texture: false })).toBe(20)
    expect(estimateCredits({ ai_model: 'latest', texture_resolution: '8k' })).toBe(35)
    expect(estimateCredits({ ai_model: 'meshy-6-lite' })).toBe(15)
    expect(estimateCredits({ ai_model: 'meshy-7.1', geometry_resolution: '2k' })).toBe(35)
  })
  it('refuses to guess unknown or surcharged configurations', () => {
    expect(() => estimateCredits({ ai_model: 'meshy-99' })).toThrow()
    expect(() => estimateCredits({ ai_model: 'meshy-7.1', texture_model: 'meshy-n1' })).toThrow()
  })
})
