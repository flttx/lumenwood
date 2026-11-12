import { Vector3 } from 'three'
// Two lighting presets (ART_DIRECTION §1 and the concept art). "Day" is a golden late afternoon: a low warm sun in the
// north backlights the trail toward the wetlands and highlands, long tree shadows fall toward the player, and the sky
// fades from clear blue to a warm peach horizon. Twilight is a cool blue dusk with an orange-pink afterglow in the north,
// amber lanterns and glowing flora. Each preset also carries the screen grade (rendering/PostFX). Colours are sRGB hex;
// values are provisional and tuned by eye.
export type TimeOfDay = 'day' | 'twilight'
export interface LightingPreset {
  skyTop: number; skyHorizon: number; fog: number; fogNear: number; fogFar: number
  hemiSky: number; hemiGround: number; hemiIntensity: number
  sun: number; sunIntensity: number; sunElevation: number; sunAzimuth: number; shadowStrength: number
  exposure: number; fireflies: number; lantern: number; flowerGlow: number
  /** Strength of the fake light around flowers (halo and ground pool); only meaningful once the sun is down. */
  flowerHalo: number
  /** Sun disc and halo in the sky. */
  sunGlow: number
  /** Screen grade: shadows pulled toward `shadeTint`, highlights toward `lightTint`; contrast, saturation, vignette. */
  shadeTint: number; lightTint: number; contrast: number; saturation: number; vignette: number
  /** Soft fill from the camera side (no shadows), so the backlit player and the near trees keep their form. */
  fill: number
  /** Bloom: strength, and the linear luminance above which pixels glow. */
  bloom: number; bloomThreshold: number
}
export const presets: Record<TimeOfDay, LightingPreset> = {
  day: {
    skyTop: 0x4f86c0, skyHorizon: 0xf6cf94, fog: 0xd2bb8a, fogNear: 30, fogFar: 170,
    hemiSky: 0xb6cce4, hemiGround: 0x5a6a34, hemiIntensity: 1.45,
    sun: 0xffc46e, sunIntensity: 4.2, sunElevation: 0.42, sunAzimuth: 0.35, shadowStrength: 0.78,
    exposure: 1.15, fireflies: 0, lantern: 0, flowerGlow: 1, flowerHalo: 0,
    sunGlow: 1, shadeTint: 0x6a88a6, lightTint: 0xe8c38c, contrast: 1.05, saturation: 1.12, vignette: 0.26,
    bloom: 0.55, bloomThreshold: 0.86, fill: 0.9,
  },
  twilight: {
    skyTop: 0x232a66, skyHorizon: 0xe8906a, fog: 0x4b4a86, fogNear: 18, fogFar: 110,
    hemiSky: 0x8f8fe0, hemiGround: 0x40523a, hemiIntensity: 2.2,
    sun: 0xff8a52, sunIntensity: 1.6, sunElevation: 0.12, sunAzimuth: 0.6, shadowStrength: 0.5,
    exposure: 1.5, fireflies: 1, lantern: 1, flowerGlow: 1.2, flowerHalo: 1,
    sunGlow: 0.4, shadeTint: 0x6658b4, lightTint: 0xf2b070, contrast: 1.05, saturation: 1.2, vignette: 0.34,
    bloom: 0.95, bloomThreshold: 0.62, fill: 0.7,
  },
}
const COLOR_KEYS = new Set<keyof LightingPreset>(['skyTop', 'skyHorizon', 'fog', 'hemiSky', 'hemiGround', 'sun', 'shadeTint', 'lightTint'])
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
/** The wetlands are cooler and mistier than the camp (ART_DIRECTION: twilight blue, low-density mist). */
export const wetlandTints: Record<TimeOfDay, { fog: number; skyHorizon: number; fogNear: number; fogFar: number }> = {
  day: { fog: 0xb8c0a4, skyHorizon: 0xe9d6a8, fogNear: 22, fogFar: 120 },
  twilight: { fog: 0x2e3f6a, skyHorizon: 0x9a7a9a, fogNear: 12, fogFar: 75 },
}
/** The highland plateau has clear, warm air and a long view (ART_DIRECTION: scale and depth, overlooking the forest). */
export const highlandTints: ZoneTints = {
  day: { fog: 0xe0cfa0, skyHorizon: 0xffd8a0, fogNear: 50, fogFar: 230 },
  twilight: { fog: 0x4a5080, skyHorizon: 0xe0906a, fogNear: 26, fogFar: 150 },
}
type ZoneTints = Record<TimeOfDay, { fog: number; skyHorizon: number; fogNear: number; fogFar: number }>
/** Pulls `out` toward a zone's look by `k` (0 none, 1 fully), for the time-of-day blend `t`. Mutates and returns `out`. */
export function applyZoneTint(out: LightingPreset, tints: ZoneTints, k: number, t: number) {
  const w = Math.max(0, Math.min(1, k)), b = Math.max(0, Math.min(1, t))
  if (w === 0) return out
  const a = tints.day, c = tints.twilight
  out.fog = lerpHex(out.fog, lerpHex(a.fog, c.fog, b), w)
  out.skyHorizon = lerpHex(out.skyHorizon, lerpHex(a.skyHorizon, c.skyHorizon, b), w)
  out.fogNear += (a.fogNear + (c.fogNear - a.fogNear) * b - out.fogNear) * w
  out.fogFar += (a.fogFar + (c.fogFar - a.fogFar) * b - out.fogFar) * w
  return out
}
/** Shared, frame-loop-owned state other systems read (fireflies, flowers, audio, debug). Not React state. */
export const atmosphere = { blend: 0, wetland: 0, highland: 0, preset: blendPresets(0), sunDirection: new Vector3(0, 1, 0) }
