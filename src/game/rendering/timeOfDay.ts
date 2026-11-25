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
    skyTop: 0x2c70c4, skyHorizon: 0xd9ebf4, fog: 0x9ec5cf, fogNear: 68, fogFar: 255,
    hemiSky: 0xaad4f5, hemiGround: 0x3b5938, hemiIntensity: 1.02,
    sun: 0xfff0cc, sunIntensity: 4.15, sunElevation: 0.5, sunAzimuth: 0.42, shadowStrength: 0.92,
    exposure: 1.06, fireflies: 0, lantern: 0, flowerGlow: 1, flowerHalo: 0,
    sunGlow: 0.92, shadeTint: 0x5c859e, lightTint: 0xeee4c6, contrast: 1.09, saturation: 1.12, vignette: 0.18,
    bloom: 0.24, bloomThreshold: 1.15, fill: 0.18,
    mist: 0.0022, mistFalloff: 0.42, rays: 0.95,
  },
  twilight: {
    skyTop: 0x1e2c59, skyHorizon: 0xee9c6e, fog: 0x4b5c78, fogNear: 28, fogFar: 145,
    hemiSky: 0x8ea4cc, hemiGround: 0x354038, hemiIntensity: 1.25,
    sun: 0xffa860, sunIntensity: 2.1, sunElevation: 0.14, sunAzimuth: 0.62, shadowStrength: 0.72,
    exposure: 1.22, fireflies: 1, lantern: 1, flowerGlow: 1.05, flowerHalo: 1,
    sunGlow: 0.65, shadeTint: 0x5d7490, lightTint: 0xf0cc96, contrast: 1.09, saturation: 1.1, vignette: 0.26,
    bloom: 0.38, bloomThreshold: 1.04, fill: 0.22,
    mist: 0.0075, mistFalloff: 0.36, rays: 0.32,
  },
  // Night (third pass): deep blue sky, a high silver moon in the north-east (the "sun" light becomes moonlight, still
  // casting soft shadows), stars and the Milky Way in the sky shader, every glow at its strongest.
  night: {
    skyTop: 0x070e20, skyHorizon: 0x1d2e42, fog: 0x162436, fogNear: 24, fogFar: 130,
    hemiSky: 0x7690b0, hemiGround: 0x202e26, hemiIntensity: 0.85,
    // The moon hangs low (about 22 degrees): the camera's pitch lets the player look only so far up.
    sun: 0xc4daf2, sunIntensity: 1.55, sunElevation: 0.38, sunAzimuth: 0.95, shadowStrength: 0.78,
    exposure: 1.28, fireflies: 1, lantern: 1, flowerGlow: 1.15, flowerHalo: 1,
    sunGlow: 0, shadeTint: 0x4d5d72, lightTint: 0xd8d8c4, contrast: 1.09, saturation: 1.06, vignette: 0.3,
    bloom: 0.4, bloomThreshold: 0.98, fill: 0.14,
    mist: 0.0075, mistFalloff: 0.36, rays: 0.06,
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
  day: { fog: 0x90bdb8, skyHorizon: 0xd0e6e4, fogNear: 34, fogFar: 155 },
  twilight: { fog: 0x3b536b, skyHorizon: 0xba9595, fogNear: 22, fogFar: 110 },
  night: { fog: 0x162a3c, skyHorizon: 0x223847, fogNear: 20, fogFar: 105 },
}
/** The highland plateau has clear, warm air and a long view (ART_DIRECTION: scale and depth, overlooking the forest). */
export const highlandTints: ZoneTints = {
  day: { fog: 0xaad0db, skyHorizon: 0xe2eef5, fogNear: 78, fogFar: 285 },
  twilight: { fog: 0x4d657c, skyHorizon: 0xe69f76, fogNear: 36, fogFar: 185 },
  night: { fog: 0x1d3244, skyHorizon: 0x2a4052, fogNear: 34, fogFar: 170 },
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
export const atmosphere = { time: 0, blend: 0, night: 0, wetland: 0, highland: 0, snapped: false, preset: blendPresets(0), sunDirection: new Vector3(0, 1, 0), moonDirection: new Vector3(0, 1, 0) }
/** Resets shared lighting state between journeys so a new session does not inherit the previous session's night sky. */
export function resetAtmosphere() {
  atmosphere.time = 0; atmosphere.blend = 0; atmosphere.night = 0; atmosphere.wetland = 0; atmosphere.highland = 0; atmosphere.snapped = false
  blendPresets(0, atmosphere.preset)
}
