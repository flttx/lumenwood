import { describe, expect, it } from 'vitest'
import { ambienceMix, chimeFrequency, nextChirpDelay } from './soundscape'
describe('soundscape helpers', () => {
  it('chimes follow the C major pentatonic and wrap', () => {
    expect(chimeFrequency(0)).toBeCloseTo(523.25)
    expect(chimeFrequency(3)).toBeCloseTo(523.25 * 2 ** (7 / 12))
    expect(chimeFrequency(8)).toBeCloseTo(chimeFrequency(0))
    expect(chimeFrequency(-1)).toBeCloseTo(chimeFrequency(7))
  })
  it('crossfades birds into crickets with the time of day', () => {
    expect(ambienceMix(0)).toMatchObject({ birds: 1, crickets: 0 })
    expect(ambienceMix(1)).toMatchObject({ birds: 0, crickets: 1 })
    expect(ambienceMix(0.5).wind).toBeGreaterThan(ambienceMix(0).wind)
  })
  it('spaces bird phrases between 1.6 and 5.6 s', () => {
    expect(nextChirpDelay(0)).toBe(1.6); expect(nextChirpDelay(0.999)).toBeLessThan(5.6)
  })
})
