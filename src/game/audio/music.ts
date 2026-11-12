// Generative score (P4): a slow C-major progression whose voices join as the forest is lit, so the music grows with the
// player's progress and gathers fully at the ending. Pure helpers; the Web Audio scheduling lives in engine.ts.
export const BEAT = 60 / 66, BEATS_PER_BAR = 4
/** One chord per bar, as semitones above C3: C, Am, F, G (fits the flowers' C pentatonic chimes). */
export const PROGRESSION = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]] as const
const C3 = 130.81
export const midiFreq = (semitones: number) => C3 * 2 ** (semitones / 12)

export interface MusicProgress { lit: number; campDone: boolean; wetlandDone: boolean; highlandLit: number; ending: boolean }
/**
 * How many voices play: 0 before any light; 1 pad after the first lantern; 2 + plucked arpeggio once the camp is done;
 * 3 + bass after the wetlands; 4–6 a voice per lit highland cradle (bells, shimmer, faster arpeggio); 7 at the ending.
 */
export function musicLayers(p: MusicProgress) {
  if (p.ending) return 7
  let layers = p.lit > 0 ? 1 : 0
  if (p.campDone) layers = 2
  if (p.wetlandDone) layers = 3
  return layers + (p.wetlandDone ? Math.min(3, p.highlandLit) : 0)
}
/** Chord for bar `bar`. */
export const chordAt = (bar: number) => PROGRESSION[((bar % PROGRESSION.length) + PROGRESSION.length) % PROGRESSION.length]
/** Arpeggio note (semitones above C3) for eighth-note `step` of `bar`: chord tones rising an octave up, then back. */
export function arpNote(bar: number, step: number) {
  const chord = chordAt(bar), tones = [chord[0], chord[1], chord[2], chord[0] + 12, chord[2], chord[1], chord[0] + 12, chord[1] + 12]
  return tones[((step % tones.length) + tones.length) % tones.length] + 12
}
/** Bell note for the melody voice: a C-pentatonic tone near the top of the chord, picked with `r` in [0, 1). */
export function bellNote(bar: number, r: number) {
  const pentatonic = [0, 2, 4, 7, 9], top = chordAt(bar)[2] + 24
  const near = pentatonic.map(p => p + 24).concat(pentatonic.map(p => p + 36)).filter(n => Math.abs(n - top) <= 7)
  return near[Math.floor(r * near.length)] ?? top
}
