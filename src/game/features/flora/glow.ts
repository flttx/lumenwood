// INT-001 reaction: flowers brighten as the player comes near. Provisional values, tune by playtesting.
export const GLOW_BASE = 0.5, GLOW_PEAK = 2.4, GLOW_NEAR = 1.2, GLOW_FAR = 4
/** Target emissive intensity for a flower at `distance` metres from the player. */
export function glowTarget(distance: number) {
  const t = Math.max(0, Math.min(1, (GLOW_FAR - distance) / (GLOW_FAR - GLOW_NEAR)))
  return GLOW_BASE + (GLOW_PEAK - GLOW_BASE) * t * t * (3 - 2 * t)
}
