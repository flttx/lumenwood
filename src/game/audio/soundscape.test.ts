import { describe, expect, it } from 'vitest'
import { ambienceMix, chimeFrequency, nextChirpDelay, nextCroakDelay } from './soundscape'
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
  it('the wetlands bring in water and frogs, louder at twilight, and thin out the camp layers', () => {
    expect(ambienceMix(0.5, 0)).toMatchObject({ water: 0, frogs: 0 })
    const day = ambienceMix(0, 1), dusk = ambienceMix(1, 1)
    expect(day.water).toBeGreaterThan(0); expect(dusk.frogs).toBeGreaterThan(day.frogs)
    expect(day.birds).toBeLessThan(ambienceMix(0, 0).birds); expect(dusk.crickets).toBeLessThan(ambienceMix(1, 0).crickets)
    expect(nextCroakDelay(0)).toBeGreaterThan(0.5); expect(nextCroakDelay(0.999)).toBeLessThan(4)
  })
  it('spaces bird phrases between 1.6 and 5.6 s', () => {
    expect(nextChirpDelay(0)).toBe(1.6); expect(nextChirpDelay(0.999)).toBeLessThan(5.6)
  })
})
