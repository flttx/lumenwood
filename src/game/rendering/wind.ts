// Shared frame-loop wind field (pure rules, unit-tested). Drives tree/foliage sway, grass waves, leaf drift, mist
// erosion, and wind gust audio cutoff in unison so the entire forest breathes together.

export interface WindState {
  dirX: number
  dirZ: number
  strength: number
  gust: number
  phase: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Deterministic wind field at `time` (s), modulated by regional elevation (`highland`) and sheltered pools (`wetland`). */
export function sampleWind(time: number, highland = 0, wetland = 0): WindState {
  const angle = 0.52 + 0.28 * Math.sin(time * 0.043) + 0.14 * Math.sin(time * 0.019)
  const dirX = Math.cos(angle)
  const dirZ = Math.sin(angle)
  const raw = 0.5 + 0.32 * Math.sin(time * 0.27) + 0.18 * Math.sin(time * 0.61 + 1.4)
  const gust = clamp01((raw - 0.35) / 0.65)
  const h = clamp01(highland)
  const w = clamp01(wetland)
  const strength = Math.max(0.25, (0.42 + 0.45 * gust) * (1 + 0.35 * h - 0.14 * w))
  return { dirX, dirZ, strength, gust, phase: time }
}

/** Frame-loop singleton written by Atmosphere and read by Grass, AmbientLife, AirEffects, and Soundscape. */
export const wind: WindState = sampleWind(0)

export function updateWind(time: number, highland = 0, wetland = 0) {
  const next = sampleWind(time, highland, wetland)
  wind.dirX = next.dirX
  wind.dirZ = next.dirZ
  wind.strength = next.strength
  wind.gust = next.gust
  wind.phase = next.phase
}

export function resetWind() {
  updateWind(0, 0, 0)
}
