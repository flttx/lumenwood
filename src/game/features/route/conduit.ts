import type { RouteProgress } from './progress'
import { LANTERN_COST, zoneLanterns } from './routeLayout'
import { ANCIENT_TREE } from '../../world/zones/highlandLayout'

export const CONDUIT_HOLD = 1.4
export interface ConduitState { near: number; expected: number; aligned: boolean; charge: number; ready: number }
export const createConduit = (): ConduitState => ({ near: -1, expected: -1, aligned: false, charge: 0, ready: -1 })
export const conduit = createConduit()
export const nextCradle = (p: RouteProgress) => zoneLanterns('highland').find(i => p.litAt[i] === null) ?? -1
export function facingTree(x: number, z: number, forwardX: number, forwardZ: number) {
  const dx = ANCIENT_TREE[0] - x, dz = ANCIENT_TREE[1] - z, length = Math.hypot(dx, dz) * Math.hypot(forwardX, forwardZ)
  // ±25.7° cone matches the Ancient Tree's visible trunk/root span from the cradle ring while still rejecting sideways/away views.
  return length > 0.01 && (dx * forwardX + dz * forwardZ) / length >= Math.cos(Math.PI / 7)
}
/** Charge is intentional: correct cradle, two followers, camera heading and held input. Pausing is handled by the owner. */
export function advanceConduit(s: ConduitState, dt: number, near: number, expected: number, carried: number, aligned: boolean, held: boolean) {
  if (s.near !== near || s.expected !== expected) s.charge = 0
  s.near = near; s.expected = expected; s.aligned = aligned; s.ready = -1
  if (near < 0 || near !== expected || carried < LANTERN_COST) { s.charge = 0; return }
  const step = Math.min(dt, 0.1)
  s.charge = Math.max(0, Math.min(1, s.charge + step * (aligned && held ? 1 / CONDUIT_HOLD : -0.8)))
  if (s.charge >= 1 - 1e-6) { s.charge = 1; s.ready = expected }
}
