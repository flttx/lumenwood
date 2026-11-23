import { Vector3 } from 'three'
// Day keeps living greens under cream sunlight, cool canopy shadows and clear air; the sun is high enough to pick out
// gaps and the daytime interaction clearing. Twilight is a cool blue dusk with an orange-pink afterglow in the north,
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
export function journeyBlend(lit: number, wetland: number, highland = 0, lanterns = 9, sunlightCrossed = false, visitedStage = 0) {
  const k = (v: number) => Math.max(0, Math.min(1, v))
  const perZone = Math.max(1, lanterns / 3), camp = k(lit / perZone), marsh = k((lit - perZone) / perZone), crown = k((lit - 2 * perZone) / perZone)
  // Event anchors, rather than a permanent offset: afternoon → camp sunset → wetland dusk → highland night.
  const lamps = lit > 2 * perZone ? 1.6 + 0.4 * crown : lit > perZone ? 0.95 + 0.4 * marsh : 0.72 * camp
  const arrival = lit >= 2 * perZone ? 1.35 + 0.25 * k(highland) : lit >= perZone ? 0.72 + 0.23 * k(Math.max(wetland, highland)) : 0
  const visited = visitedStage >= 2 ? 1.6 : visitedStage >= 1 ? 0.95 : 0
  return Math.min(2, Math.max(lamps, arrival, visited, sunlightCrossed ? 0.3 : 0))
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
    skyTop: 0x5796c9, skyHorizon: 0xe4e7d2, fog: 0xb4cabc, fogNear: 50, fogFar: 225,
    hemiSky: 0xb9d8ee, hemiGround: 0x416548, hemiIntensity: 1.35,
    sun: 0xffeed4, sunIntensity: 3.5, sunElevation: 0.58, sunAzimuth: 0.35, shadowStrength: 0.86,
    exposure: 1.08, fireflies: 0, lantern: 0, flowerGlow: 1, flowerHalo: 0,
    sunGlow: 0.78, shadeTint: 0x7297a1, lightTint: 0xe0dfc2, contrast: 1.07, saturation: 1.1, vignette: 0.2,
    bloom: 0.26, bloomThreshold: 1.1, fill: 0.65,
    mist: 0.0035, mistFalloff: 0.36, rays: 1.15,
  },
  twilight: {
    skyTop: 0x30395f, skyHorizon: 0xe0a17d, fog: 0x55677c, fogNear: 22, fogFar: 120,
    hemiSky: 0xa4b5cf, hemiGround: 0x42553e, hemiIntensity: 1.75,
    sun: 0xffb37a, sunIntensity: 1.45, sunElevation: 0.12, sunAzimuth: 0.6, shadowStrength: 0.6,
    exposure: 1.24, fireflies: 1, lantern: 1, flowerGlow: 1.05, flowerHalo: 1,
    sunGlow: 0.35, shadeTint: 0x6b8292, lightTint: 0xead09d, contrast: 1.08, saturation: 1.08, vignette: 0.28,
    bloom: 0.4, bloomThreshold: 1, fill: 0.55,
    mist: 0.01, mistFalloff: 0.34, rays: 0.2,
  },
  // Night (third pass): deep blue sky, a high silver moon in the north-east (the "sun" light becomes moonlight, still
  // casting soft shadows), stars and the Milky Way in the sky shader, every glow at its strongest.
  night: {
    skyTop: 0x0b1328, skyHorizon: 0x293946, fog: 0x1f2c3e, fogNear: 20, fogFar: 110,
    hemiSky: 0x8a9db3, hemiGround: 0x243429, hemiIntensity: 1.25,
    // The moon hangs low (about 22 degrees): the camera's pitch lets the player look only so far up.
    sun: 0xcbd9df, sunIntensity: 1, sunElevation: 0.38, sunAzimuth: 0.95, shadowStrength: 0.65,
    exposure: 1.35, fireflies: 1, lantern: 1, flowerGlow: 1.15, flowerHalo: 1,
    sunGlow: 0, shadeTint: 0x52647a, lightTint: 0xd4d4bb, contrast: 1.08, saturation: 1.02, vignette: 0.34,
    bloom: 0.44, bloomThreshold: 0.95, fill: 0.45,
    mist: 0.011, mistFalloff: 0.34, rays: 0.06,
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
  day: { fog: 0xa5c4ba, skyHorizon: 0xdae6d7, fogNear: 26, fogFar: 130 },
  twilight: { fog: 0x425d70, skyHorizon: 0xaf9b9a, fogNear: 17, fogFar: 90 },
  night: { fog: 0x1c3040, skyHorizon: 0x2c404b, fogNear: 16, fogFar: 90 },
}
/** The highland plateau has clear, warm air and a long view (ART_DIRECTION: scale and depth, overlooking the forest). */
export const highlandTints: ZoneTints = {
  day: { fog: 0xc4d6cc, skyHorizon: 0xe8e9d3, fogNear: 56, fogFar: 240 },
  twilight: { fog: 0x536b79, skyHorizon: 0xdaa17e, fogNear: 30, fogFar: 165 },
  night: { fog: 0x243a47, skyHorizon: 0x354954, fogNear: 28, fogFar: 150 },
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
