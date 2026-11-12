import { LANTERN_COST, LANTERN_RANGE, lanterns, zoneLanterns, type Zone } from './routeLayout'
// Route progress for one play session (no save yet). Pure functions over a plain object, so the rules are unit-tested;
// the shared instance below is owned by the frame loop like `atmosphere`, never React state.
export interface RouteProgress {
  /** Flowers that have already released their firefly (each releases once). */
  released: Set<number>
  /** Fireflies following the player. */
  carried: number
  /** Session time (s) each lantern was lit, or null while dark. */
  litAt: (number | null)[]
  /** Session time (s) each zone's route completed, or null. */
  completedAt: Record<Zone, number | null>
  /** Last time (s) the player reached each dark lantern without enough fireflies, for its flicker hint. */
  shortAt: (number | null)[]
  /** Time (s) the player first stood in the hidden glade, or null. */
  finaleAt: number | null
  /** Guidance captions already shown (each plays once per journey). */
  captions: Set<string>
  /** Whether the ending card has been shown. */
  endingSeen: boolean
}
export function createProgress(): RouteProgress {
  return { released: new Set(), carried: 0, litAt: lanterns.map(() => null), completedAt: { camp: null, wetland: null, highland: null }, shortAt: lanterns.map(() => null), finaleAt: null, captions: new Set(), endingSeen: false }
}
/** A flower woke: it releases one follower the first time only. Returns true when a firefly was released. */
export function releaseFirefly(p: RouteProgress, flower: number) {
  if (p.released.has(flower)) return false
  p.released.add(flower); p.carried++
  return true
}
export type LanternResult = 'lit' | 'short' | 'none'
/**
 * The player stands `distance` m from dark lantern `index`: light it if they carry enough fireflies ('lit'), or report
 * that they are close but short ('short'). Lit lanterns and far players give 'none'. Completing a zone stamps its time.
 */
export function tryLight(p: RouteProgress, index: number, distance: number, now: number): LanternResult {
  if (p.litAt[index] !== null || distance > LANTERN_RANGE) return 'none'
  if (p.carried < LANTERN_COST) { p.shortAt[index] = now; return 'short' }
  p.carried -= LANTERN_COST; p.litAt[index] = now
  const zone = lanterns[index].zone
  if (p.completedAt[zone] === null && zoneLanterns(zone).every(i => p.litAt[i] !== null)) p.completedAt[zone] = now
  return 'lit'
}
/** Shared session progress. */
export const route = createProgress()
/** Seconds from a zone's completion until its stream reaches the gate and the mist has cleared. */
export const GATE_DELAY = 4
/** True once the zone's firefly stream has had time to reach its gate. */
export function gateOpen(p: RouteProgress, zone: Zone, now: number) {
  const done = p.completedAt[zone]
  return done !== null && now - done >= GATE_DELAY
}
/** Play time in seconds; advances only while the game is playing, so pausing never skips route animations. */
export const routeClock = { now: 0 }
/** The ramp to the highlands opens once the glade finale's column has risen. */
export function ascentOpen(p: RouteProgress, now: number) { return p.finaleAt !== null && now - p.finaleAt >= GATE_DELAY }
/** The first time the player stands in the glade the route's finale plays; returns true on that frame only. */
export function reachFinale(p: RouteProgress, inGlade: boolean, now: number) {
  if (!inGlade || p.finaleAt !== null) return false
  p.finaleAt = now
  return true
}
/** Starts a new journey in place (the shared `route` object is referenced everywhere, so it is never replaced). */
export function resetProgress(p: RouteProgress) { Object.assign(p, createProgress()) }
