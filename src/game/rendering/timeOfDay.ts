// Two lighting presets for the camp (ART_DIRECTION §1: warm sun through canopy by day; blue ambient with amber accents at
// twilight). Colours are sRGB hex; values are provisional and tuned by eye.
export type TimeOfDay = 'day' | 'twilight'
export interface LightingPreset {
  skyTop: number; skyHorizon: number; fog: number; fogNear: number; fogFar: number
  hemiSky: number; hemiGround: number; hemiIntensity: number
  sun: number; sunIntensity: number; sunElevation: number; sunAzimuth: number; shadowStrength: number
  exposure: number; fireflies: number; lantern: number; flowerGlow: number
  /** Strength of the fake light around flowers (halo and ground pool); only meaningful once the sun is down. */
  flowerHalo: number
}
export const presets: Record<TimeOfDay, LightingPreset> = {
  day: {
    skyTop: 0x7aa7cc, skyHorizon: 0xe2e2c6, fog: 0xc8d4bd, fogNear: 28, fogFar: 95,
    hemiSky: 0xf2eed6, hemiGround: 0x5a6a43, hemiIntensity: 1.5,
    sun: 0xffe0a6, sunIntensity: 2.8, sunElevation: 0.9, sunAzimuth: 0.6, shadowStrength: 0.85,
    exposure: 1, fireflies: 0, lantern: 0, flowerGlow: 1, flowerHalo: 0,
  },
  twilight: {
    skyTop: 0x22335a, skyHorizon: 0xb08c8c, fog: 0x4c5a7a, fogNear: 16, fogFar: 62,
    hemiSky: 0x8299cc, hemiGround: 0x3a4636, hemiIntensity: 1.7,
    sun: 0xffa66e, sunIntensity: 1.1, sunElevation: 0.3, sunAzimuth: 2.4, shadowStrength: 0.45,
    exposure: 1.25, fireflies: 1, lantern: 1, flowerGlow: 2.6, flowerHalo: 1,
  },
}
const COLOR_KEYS = new Set<keyof LightingPreset>(['skyTop', 'skyHorizon', 'fog', 'hemiSky', 'hemiGround', 'sun'])
function lerpHex(a: number, b: number, t: number) {
  let out = 0
  for (const shift of [16, 8, 0]) out |= Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * t)) << shift
  return out
}
/** Preset at `t` between day (0) and twilight (1); colours blend per sRGB channel. */
export function blendPresets(t: number, out: LightingPreset = { ...presets.day }) {
  const a = presets.day, b = presets.twilight, k = Math.max(0, Math.min(1, t))
  if (k === 0 || k === 1) return Object.assign(out, k ? b : a) // exact ends, no float drift
  for (const key of Object.keys(a) as (keyof LightingPreset)[]) out[key] = COLOR_KEYS.has(key) ? lerpHex(a[key], b[key], k) : a[key] + (b[key] - a[key]) * k
  return out
}
/** Shared, frame-loop-owned state other systems read (fireflies, flowers, audio, debug). Not React state. */
export const atmosphere = { blend: 0, preset: blendPresets(0) }
