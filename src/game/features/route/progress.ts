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
}
export function createProgress(): RouteProgress {
  return { released: new Set(), carried: 0, litAt: lanterns.map(() => null), completedAt: { camp: null, wetland: null }, shortAt: lanterns.map(() => null) }
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
