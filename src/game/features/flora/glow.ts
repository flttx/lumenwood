// INT-001 reaction: flowers brighten as the player comes near. Provisional values, tune by playtesting.
export const GLOW_BASE = 0.5, GLOW_PEAK = 2.4, GLOW_NEAR = 1.2, GLOW_FAR = 4
/** Target emissive intensity for a flower at `distance` metres from the player. */
export function glowTarget(distance: number) {
  const t = Math.max(0, Math.min(1, (GLOW_FAR - distance) / (GLOW_FAR - GLOW_NEAR)))
  return GLOW_BASE + (GLOW_PEAK - GLOW_BASE) * t * t * (3 - 2 * t)
}
// Waking: a flower answers once (light wave + chime) when the player steps close, and re-arms after they walk away.
export const WAKE_NEAR = 1.6, WAKE_REARM = 3.2, WAVE_DURATION = 1.6, WAVE_RADIUS = 2.4, WAVE_FLASH = 1.2
/** Next awake state; a false → true change is the moment the flower wakes. */
export function nextAwake(awake: boolean, distance: number) { return awake ? distance < WAKE_REARM : distance < WAKE_NEAR }
/** Expanding ground ring `age` seconds after waking (ease-out radius, fading opacity); null outside the wave. */
export function lightWave(age: number) {
  if (!(age >= 0 && age < WAVE_DURATION)) return null
  const t = age / WAVE_DURATION
  return { radius: WAVE_RADIUS * (1 - (1 - t) ** 3), opacity: (1 - t) ** 2 }
}
