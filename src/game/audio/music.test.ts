import { describe, expect, it } from 'vitest'
import { arpNote, bellNote, chordAt, midiFreq, musicLayers } from './music'
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
})
