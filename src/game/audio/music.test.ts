import { describe, expect, it } from 'vitest'
import { arpNote, bellNote, chordAt, chordVariant, isBreathingBar, midiFreq, musicLayers, preludeNote } from './music'
const base = { lit: 0, campDone: false, wetlandDone: false, highlandLit: 0, ending: false }
describe('music', () => {
  it('adds voices as the forest is lit, and all of them at the ending', () => {
    expect(musicLayers(base)).toBe(0)
    expect(musicLayers({ ...base, lit: 1 })).toBe(1)
    expect(musicLayers({ ...base, lit: 3, campDone: true })).toBe(2)
    expect(musicLayers({ ...base, lit: 6, campDone: true, wetlandDone: true })).toBe(3)
    expect(musicLayers({ ...base, lit: 8, campDone: true, wetlandDone: true, highlandLit: 2 })).toBe(5)
    expect(musicLayers({ ...base, ending: true })).toBe(7)
  })
  it('cycles C – Am – F – G and keeps every note in C major', () => {
    expect(chordAt(0)).toEqual([0, 4, 7]); expect(chordAt(4)).toEqual(chordAt(0)); expect(chordAt(-1)).toEqual(chordAt(3))
    const major = new Set([0, 2, 4, 5, 7, 9, 11])
    for (let bar = 0; bar < 4; bar++) for (let step = 0; step < 8; step++) expect(major.has(((arpNote(bar, step) % 12) + 12) % 12)).toBe(true)
    for (let bar = 0; bar < 4; bar++) for (const r of [0, 0.3, 0.7, 0.99]) expect(new Set([0, 2, 4, 7, 9]).has(((bellNote(bar, r) % 12) + 12) % 12)).toBe(true)
  })
  it('converts semitones to frequency', () => { expect(midiFreq(12)).toBeCloseTo(midiFreq(0) * 2) })
  it('adds 8-bar breathing rests, C-major harmonic colour variants, and pentatonic prelude tones', () => {
    expect(isBreathingBar(0)).toBe(false)
    expect(isBreathingBar(6)).toBe(false)
    expect(isBreathingBar(7)).toBe(true)
    expect(isBreathingBar(15)).toBe(true)
    const major = new Set([0, 2, 4, 5, 7, 9, 11])
    for (let bar = 0; bar < 16; bar++) {
      for (const n of chordVariant(bar)) expect(major.has(((n % 12) + 12) % 12)).toBe(true)
    }
    expect(chordVariant(6).length).toBe(4) // Fmaj7 on second 4-bar phrase
    const penta = new Set([0, 2, 4, 7, 9])
    for (let s = 0; s < 12; s++) expect(penta.has(((preludeNote(s) % 12) + 12) % 12)).toBe(true)
  })
})
