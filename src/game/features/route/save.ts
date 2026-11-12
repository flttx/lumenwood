import { LANTERN_COST, lanterns, ZONES, type Zone } from './routeLayout'
import { flowers } from '../../world/zones/floraLayout'
import type { RouteProgress } from './progress'
// Local save (P4): route progress, seen captions and the player's position in localStorage. Times are not stored; a
// restored lantern or zone counts as done long ago, so its animations are already complete. Saves from a different world
// layout (lantern or flower counts changed) are ignored rather than half-applied.
const KEY = 'lumenwood-save-v1'
/** How long ago restored events are treated as having happened (s): beyond every animation and gate delay. */
export const RESTORED_AGE = 1000
export interface SaveData {
  v: 1; released: number[]; lit: boolean[]; completed: Zone[]; finale: boolean; captions: string[]; ending: boolean; position: [number, number]
}
export function serialize(p: RouteProgress, position: [number, number]): SaveData {
  return {
    v: 1, released: [...p.released].sort((a, b) => a - b), lit: p.litAt.map(t => t !== null),
    completed: ZONES.filter(z => p.completedAt[z] !== null), finale: p.finaleAt !== null, captions: [...p.captions], ending: p.endingSeen,
    position: [Math.round(position[0] * 100) / 100, Math.round(position[1] * 100) / 100],
  }
}
const isNumberPair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number' && Number.isFinite(n))
/** Parses and checks a save against the current layout; null for anything missing, malformed or from another layout. */
export function parseSave(text: string | null): SaveData | null {
  if (!text) return null
  let data: unknown
  try { data = JSON.parse(text) } catch { return null }
  if (typeof data !== 'object' || data === null) return null
  const d = data as Partial<SaveData>
  if (d.v !== 1 || !Array.isArray(d.lit) || d.lit.length !== lanterns.length || !d.lit.every(b => typeof b === 'boolean')) return null
  if (!Array.isArray(d.released) || !d.released.every(i => Number.isInteger(i) && i >= 0 && i < flowers.length)) return null
  if (!Array.isArray(d.completed) || !d.completed.every(z => ZONES.includes(z)) || !Array.isArray(d.captions) || !isNumberPair(d.position)) return null
  return { v: 1, released: d.released, lit: d.lit, completed: d.completed, finale: d.finale === true, captions: d.captions.filter(c => typeof c === 'string'), ending: d.ending === true, position: d.position }
}
/** Rewrites `p` in place from a save; carried fireflies are whatever was released and not yet spent on lanterns. */
export function restore(p: RouteProgress, data: SaveData, now: number) {
  const past = now - RESTORED_AGE
  p.released = new Set(data.released)
  p.litAt = data.lit.map(lit => (lit ? past : null))
  p.shortAt = lanterns.map(() => null)
  for (const zone of ZONES) p.completedAt[zone] = data.completed.includes(zone) ? past : null
  p.finaleAt = data.finale ? past : null
  p.captions = new Set(data.captions)
  p.endingSeen = data.ending
  p.carried = Math.max(0, p.released.size - data.lit.filter(Boolean).length * LANTERN_COST)
}
/** Where the next World mount should place the player (a continued journey); consumed once. */
export const spawnPoint: { position: [number, number] | null } = { position: null }
/** localStorage can be unavailable (private mode, blocked storage); the game then simply plays without saving. */
export function readSave() {
  try { return parseSave(window.localStorage.getItem(KEY)) } catch { return null }
}
export function writeSave(data: SaveData) {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); return true } catch { return false }
}
export function clearSave() {
  try { window.localStorage.removeItem(KEY); return true } catch { return false }
}
