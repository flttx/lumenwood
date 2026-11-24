import { LANTERN_COST, lanterns, ZONES, type Zone } from './routeLayout'
import { flowers } from '../../world/zones/floraLayout'
import { SECRET_IDS, type RouteProgress, type SecretId } from './progress'
import { seeds as seedSpots } from '../../world/zones/sideLayout'
import { parseSunlight, restoreSunlight, safeSunlightSpawn, type SunlightSave } from '../sunlight/progress'
import { clampToRegions, regionDistance, walkableRegions } from '../../world/regions'
// Local save (P4): route progress, seen captions and the player's position in localStorage. Times are not stored; a
// restored lantern or zone counts as done long ago, so its animations are already complete. Saves from a different world
// layout (lantern or flower counts changed) are ignored rather than half-applied.
const KEY = 'lumenwood-save-v1'
/** How long ago restored events are treated as having happened (s): beyond every animation and gate delay. */
export const RESTORED_AGE = 1000
export interface SaveData {
  v: 2; released: number[]; lit: boolean[]; completed: Zone[]; finale: boolean; captions: string[]; ending: boolean; position: [number, number]
  /** Since v2 (2026-11-12): light seeds picked up and side-area secrets solved; a v1 save loads with none. */
  seeds: number[]; secrets: SecretId[]
  sunlight?: SunlightSave
  /** Optional saved camera look angles [yaw, pitch] so continuing faces the direction the player left off. */
  view?: [number, number]
}
export function serialize(p: RouteProgress, position: [number, number], view?: [number, number]): SaveData {
  const out: SaveData = {
    v: 2, released: [...p.released].sort((a, b) => a - b), lit: p.litAt.map(t => t !== null),
    sunlight: { steps: [...p.sunlight.steps], grown: p.sunlight.grownAt !== null, crossed: p.sunlight.crossed },
    seeds: [...p.seedsAt.keys()].sort((a, b) => a - b), secrets: [...p.secretsAt.keys()],
    completed: ZONES.filter(z => p.completedAt[z] !== null), finale: p.finaleAt !== null, captions: [...p.captions], ending: p.endingSeen,
    position: [Math.round(position[0] * 100) / 100, Math.round(position[1] * 100) / 100],
  }
  if (view && Number.isFinite(view[0]) && Number.isFinite(view[1])) out.view = [Math.round(view[0] * 1000) / 1000, Math.round(view[1] * 1000) / 1000]
  return out
}
const isNumberPair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number' && Number.isFinite(n))
/** Parses and checks a save against the current layout; null for anything missing, malformed or from another layout. */
export function parseSave(text: string | null): SaveData | null {
  if (!text) return null
  let data: unknown
  try { data = JSON.parse(text) } catch { return null }
  if (typeof data !== 'object' || data === null) return null
  const raw = data as Partial<Omit<SaveData, 'v'>> & { v?: number }, d = raw
  if ((raw.v !== 1 && raw.v !== 2) || !Array.isArray(d.lit) || d.lit.length !== lanterns.length || !d.lit.every(b => typeof b === 'boolean')) return null
  if (!Array.isArray(d.released) || !d.released.every(i => Number.isInteger(i) && i >= 0 && i < flowers.length)) return null
  if (!Array.isArray(d.completed) || !d.completed.every(z => ZONES.includes(z)) || !Array.isArray(d.captions) || !isNumberPair(d.position)) return null
  const seeds = Array.isArray(raw.seeds) ? raw.seeds.filter((i: unknown): i is number => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < seedSpots.length) : []
  const secrets = Array.isArray(raw.secrets) ? raw.secrets.filter((s: unknown): s is SecretId => SECRET_IDS.includes(s as SecretId)) : []
  const sunlight = parseSunlight(raw.sunlight)
  const finale = d.finale === true
  let position = safeSunlightSpawn(d.position, sunlight.grown)
  const allowed = walkableRegions(d.completed.includes('camp'), d.completed.includes('wetland'), finale)
  if (regionDistance(position[0], position[1], allowed) > 2) {
    const clamped = { x: position[0], z: position[1] }
    clampToRegions(clamped, allowed)
    position = safeSunlightSpawn([clamped.x, clamped.z], sunlight.grown)
  }
  const view: [number, number] | undefined = isNumberPair(raw.view) ? [raw.view[0], Math.max(-0.85, Math.min(1.1, raw.view[1]))] : undefined
  return { v: 2, seeds, secrets, sunlight, view, released: d.released, lit: d.lit, completed: d.completed, finale, captions: d.captions.filter(c => typeof c === 'string'), ending: d.ending === true, position }
}
/** Rewrites `p` in place from a save; carried fireflies are whatever was released and not yet spent on lanterns. */
export function restore(p: RouteProgress, data: SaveData, now: number) {
  const past = now - RESTORED_AGE
  p.sunlight = restoreSunlight(parseSunlight(data.sunlight), past)
  p.released = new Set(data.released)
  p.releasedAt = new Map(data.released.map(i => [i, past]))
  p.litAt = data.lit.map(lit => (lit ? past : null))
  p.shortAt = lanterns.map(() => null)
  for (const zone of ZONES) p.completedAt[zone] = data.completed.includes(zone) ? past : null
  p.finaleAt = data.finale ? past : null
  p.captions = new Set(data.captions)
  p.endingSeen = data.ending
  p.seedsAt = new Map(data.seeds.map(i => [i, past]))
  p.secretsAt = new Map(data.secrets.map(s => [s, past]))
  // Only camp/wetland/highland flowers carry fireflies toward lanterns; glade flowers are decorative.
  const routeReleased = [...p.released].filter(i => flowers[i]?.zone !== 'glade').length
  p.carried = Math.max(0, routeReleased - data.lit.filter(Boolean).length * LANTERN_COST)
}
/** Where the next World mount should place the player (a continued journey). */
export const spawnPoint: { position: [number, number] | null; view: [number, number] | null } = { position: null, view: null }
/** Other systems (side-area secrets, seeds) ask the route director to save at its next frame. */
export const saveRequest = { dirty: false }
let lastWrittenRaw: string | null = null
/** Latest live player pose, so returning to title or closing the page can flush the final position cleanly. */
export const livePose: { position: [number, number] | null; view: [number, number] | null } = { position: null, view: null }
export function flushLiveSave(p: RouteProgress, onlyIfUnchanged = false) {
  if (!livePose.position) return false
  if (onlyIfUnchanged) {
    try {
      const current = window.localStorage.getItem(KEY)
      // Never overwrite a save modified externally (e.g. another tab) or before this session has saved once.
      if (lastWrittenRaw === null || current !== lastWrittenRaw) return false
    } catch { return false }
  }
  return writeSave(serialize(p, livePose.position, livePose.view ?? undefined))
}
/** localStorage can be unavailable (private mode, blocked storage); the game then simply plays without saving. */
export function readSave() {
  try { return parseSave(window.localStorage.getItem(KEY)) } catch { return null }
}
export function writeSave(data: SaveData) {
  try {
    const raw = JSON.stringify(data)
    window.localStorage.setItem(KEY, raw)
    lastWrittenRaw = raw
    return true
  } catch { return false }
}
export function clearSave() {
  lastWrittenRaw = null
  try { window.localStorage.removeItem(KEY); return true } catch { return false }
}
