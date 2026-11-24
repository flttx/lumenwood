// Pure helpers for the synthesised camp soundscape.
/** Major pentatonic from C5; flower `index` picks a note so neighbouring flowers form a gentle chord. */
const STEPS = [0, 2, 4, 7, 9, 12, 14, 16]
export function chimeFrequency(index: number) { return 523.25 * 2 ** (STEPS[((index % STEPS.length) + STEPS.length) % STEPS.length] / 12) }
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/**
 * Layer levels for a time-of-day blend (0 day, 1 twilight), how far the listener is into the wetlands (0 camp, 1 deep in),
 * highland elevation blend (0..1), and shared wind gust (0..1): birds by day, crickets at twilight, wind always (with
 * gust surge & highland pine boughs); in the wetlands lapping water and frogs take over from the camp's birds and crickets.
 */
export function ambienceMix(blend: number, wetland = 0, highland = 0, gust = 0) {
  const t = clamp01(blend), w = clamp01(wetland), h = clamp01(highland), g = clamp01(gust)
  return {
    wind: (0.32 + 0.12 * t) * (1 + 0.42 * g),
    birds: (1 - t) * (1 - 0.6 * w),
    crickets: t * (1 - 0.7 * w) * (1 - 0.35 * h),
    water: 0.5 * w,
    frogs: w * (0.35 + 0.65 * t),
    pine: h * (0.28 + 0.35 * g),
  }
}
/** Seconds until the next frog call; `r` in [0, 1). */
export function nextCroakDelay(r: number) { return 0.9 + r * 2.6 }
/** Seconds until the next bird phrase; `r` in [0, 1). */
export function nextChirpDelay(r: number) { return 1.6 + r * 4 }
/** Seconds until a distant night owl call; `r` in [0, 1). */
export function nextOwlDelay(r: number) { return 14 + r * 14 }
