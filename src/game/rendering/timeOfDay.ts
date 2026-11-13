import { Vector3 } from 'three'
// Two lighting presets (ART_DIRECTION §1 and the concept art). "Day" is a golden late afternoon: a low warm sun in the
// north backlights the trail toward the wetlands and highlands, long tree shadows fall toward the player, and the sky
// fades from clear blue to a warm peach horizon. Twilight is a cool blue dusk with an orange-pink afterglow in the north,
// amber lanterns and glowing flora. Each preset also carries the screen grade (rendering/PostFX). Colours are sRGB hex;
// values are provisional and tuned by eye.
export type TimeOfDay = 'day' | 'twilight' | 'night'
/** Position of each preset on the time scale (0 day, 1 twilight, 2 night). */
export const TIME_POINT: Record<TimeOfDay, number> = { day: 0, twilight: 1, night: 2 }
/** Player setting: a fixed time, or 'journey' (default since 2026-11-12) where the sun sets as the journey goes on. */
export type TimeSetting = 'journey' | TimeOfDay
/**
 * Journey time on the 0 (day) – 1 (twilight) – 2 (night) scale (2026-11-12, third pass: the user asked for a real night
 * with stars and a moon): golden afternoon in the camp, each lit lantern lowering the sun; dusk in the wetlands that
 * deepens into night as they are lit; night on the highland, full night with the last cradles. `wetland` and `highland`
 * are how far the player is into those zones (0–1), `lit` how many lanterns burn.
 */
export function journeyBlend(lit: number, wetland: number, highland = 0, lanterns = 9) {
  const k = (v: number) => Math.max(0, Math.min(1, v))
  return Math.min(2, 1.0 * lit / lanterns + 0.6 * k(Math.max(wetland, highland)) + 0.4 * k(highland))
}
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
  /** Low mist (rendering/AtmospherePass): density at the camera's foot, falloff per metre of height; light-shaft strength. */
  mist: number; mistFalloff: number; rays: number
}
export const presets: Record<TimeOfDay, LightingPreset> = {
  day: {
    skyTop: 0x4f86c0, skyHorizon: 0xf6cf94, fog: 0xcdc29a, fogNear: 38, fogFar: 210,
    hemiSky: 0xb6cce4, hemiGround: 0x5a6a34, hemiIntensity: 1.45,
    sun: 0xffc46e, sunIntensity: 4.2, sunElevation: 0.42, sunAzimuth: 0.35, shadowStrength: 0.78,
    exposure: 1.15, fireflies: 0, lantern: 0, flowerGlow: 1, flowerHalo: 0,
    sunGlow: 1, shadeTint: 0x6a88a6, lightTint: 0xe8c38c, contrast: 1.05, saturation: 1.12, vignette: 0.26,
    bloom: 0.55, bloomThreshold: 0.86, fill: 0.9,
    mist: 0.006, mistFalloff: 0.3, rays: 1.4,
  },
  twilight: {
    skyTop: 0x232a66, skyHorizon: 0xe8906a, fog: 0x4b4a86, fogNear: 18, fogFar: 110,
    hemiSky: 0x8f8fe0, hemiGround: 0x40523a, hemiIntensity: 2.2,
    sun: 0xff8a52, sunIntensity: 1.6, sunElevation: 0.12, sunAzimuth: 0.6, shadowStrength: 0.5,
    exposure: 1.5, fireflies: 1, lantern: 1, flowerGlow: 1.2, flowerHalo: 1,
    sunGlow: 0.4, shadeTint: 0x6658b4, lightTint: 0xf2b070, contrast: 1.05, saturation: 1.2, vignette: 0.34,
    bloom: 0.95, bloomThreshold: 0.62, fill: 0.7,
    mist: 0.016, mistFalloff: 0.32, rays: 0.35,
  },
  // Night (third pass): deep blue sky, a high silver moon in the north-east (the "sun" light becomes moonlight, still
  // casting soft shadows), stars and the Milky Way in the sky shader, every glow at its strongest.
  night: {
    skyTop: 0x070d26, skyHorizon: 0x26315e, fog: 0x18203f, fogNear: 16, fogFar: 105,
    hemiSky: 0x6a7cc4, hemiGround: 0x1c2622, hemiIntensity: 1.7,
    // The moon hangs low (about 22 degrees): the camera's pitch lets the player look only so far up.
    sun: 0xb8ccff, sunIntensity: 1.1, sunElevation: 0.38, sunAzimuth: 0.95, shadowStrength: 0.6,
    exposure: 1.6, fireflies: 1, lantern: 1, flowerGlow: 1.45, flowerHalo: 1.25,
    sunGlow: 0, shadeTint: 0x34449a, lightTint: 0xc6d4ff, contrast: 1.06, saturation: 1.08, vignette: 0.4,
    bloom: 1.05, bloomThreshold: 0.55, fill: 0.55,
    mist: 0.018, mistFalloff: 0.3, rays: 0.12,
  },
}
const COLOR_KEYS = new Set<keyof LightingPreset>(['skyTop', 'skyHorizon', 'fog', 'hemiSky', 'hemiGround', 'sun', 'shadeTint', 'lightTint'])
function lerpHex(a: number, b: number, t: number) {
  let out = 0
  for (const shift of [16, 8, 0]) out |= Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * t)) << shift
  return out
}
/** Preset at `t` on the time scale: day (0) → twilight (1) → night (2); colours blend per sRGB channel. */
export function blendPresets(t: number, out: LightingPreset = { ...presets.day }) {
  const c = Math.max(0, Math.min(2, t)), late = c > 1
  const a = late ? presets.twilight : presets.day, b = late ? presets.night : presets.twilight, k = late ? c - 1 : c
  if (k === 0 || k === 1) return Object.assign(out, k ? b : a) // exact ends, no float drift
  for (const key of Object.keys(a) as (keyof LightingPreset)[]) out[key] = COLOR_KEYS.has(key) ? lerpHex(a[key], b[key], k) : a[key] + (b[key] - a[key]) * k
  return out
}
/** The wetlands are cooler and mistier than the camp (ART_DIRECTION: twilight blue, low-density mist). */
export const wetlandTints: ZoneTints = {
  day: { fog: 0xb8c0a4, skyHorizon: 0xe9d6a8, fogNear: 22, fogFar: 120 },
  twilight: { fog: 0x2e3f6a, skyHorizon: 0x9a7a9a, fogNear: 12, fogFar: 75 },
  night: { fog: 0x141c3a, skyHorizon: 0x222c56, fogNear: 12, fogFar: 80 },
}
/** The highland plateau has clear, warm air and a long view (ART_DIRECTION: scale and depth, overlooking the forest). */
export const highlandTints: ZoneTints = {
  day: { fog: 0xe0cfa0, skyHorizon: 0xffd8a0, fogNear: 50, fogFar: 230 },
  twilight: { fog: 0x4a5080, skyHorizon: 0xe0906a, fogNear: 26, fogFar: 150 },
  night: { fog: 0x1c2548, skyHorizon: 0x2c3868, fogNear: 24, fogFar: 140 },
}
type ZoneTints = Record<TimeOfDay, { fog: number; skyHorizon: number; fogNear: number; fogFar: number }>
/** Pulls `out` toward a zone's look by `k` (0 none, 1 fully), for the time `t` (0–2). Mutates and returns `out`. */
export function applyZoneTint(out: LightingPreset, tints: ZoneTints, k: number, t: number) {
  const w = Math.max(0, Math.min(1, k)), c2 = Math.max(0, Math.min(2, t)), late = c2 > 1, b = late ? c2 - 1 : c2
  if (w === 0) return out
  const a = late ? tints.twilight : tints.day, c = late ? tints.night : tints.twilight
  out.fog = lerpHex(out.fog, lerpHex(a.fog, c.fog, b), w)
  out.skyHorizon = lerpHex(out.skyHorizon, lerpHex(a.skyHorizon, c.skyHorizon, b), w)
  out.fogNear += (a.fogNear + (c.fogNear - a.fogNear) * b - out.fogNear) * w
  out.fogFar += (a.fogFar + (c.fogFar - a.fogFar) * b - out.fogFar) * w
  return out
}
/** Shared, frame-loop-owned state other systems read (fireflies, flowers, audio, debug). Not React state. */
// `time` is the 0–2 scale; `blend` (0–1, how far toward dusk, read by most effects) and `night` (0–1 past dusk) derive from it.
export const atmosphere = { time: 0, blend: 0, night: 0, wetland: 0, highland: 0, preset: blendPresets(0), sunDirection: new Vector3(0, 1, 0), moonDirection: new Vector3(0, 1, 0) }
