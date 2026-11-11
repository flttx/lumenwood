// Pure helpers for the synthesised camp soundscape.
/** Major pentatonic from C5; flower `index` picks a note so neighbouring flowers form a gentle chord. */
const STEPS = [0, 2, 4, 7, 9, 12, 14, 16]
export function chimeFrequency(index: number) { return 523.25 * 2 ** (STEPS[((index % STEPS.length) + STEPS.length) % STEPS.length] / 12) }
/** Layer levels for a time-of-day blend (0 day, 1 twilight): birds by day, crickets at twilight, wind always. */
export function ambienceMix(blend: number) {
  const t = Math.max(0, Math.min(1, blend))
  return { wind: 0.32 + 0.12 * t, birds: 1 - t, crickets: t }
}
/** Seconds until the next bird phrase; `r` in [0, 1). */
export function nextChirpDelay(r: number) { return 1.6 + r * 4 }
