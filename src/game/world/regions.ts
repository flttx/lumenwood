import { WORLD_LIMIT } from '../player/movement'
import { sz } from './scale'
// Walkable area: a union of axis-aligned rectangles. The camp is the original square; a corridor leads north from the end
// of the camp trail to the wetlands, and a light bridge crosses the wetlands' deep channel to a hidden glade. Gated
// regions are shaped into the terrain from the start but only become walkable once their gate opens (firefly routes).
// A ramp climbs north out of the glade to the highland plateau. The ground is flat at y = 0 in the camp, corridor and
// glade; it sinks into the wetland pools (wetlandLayout.ts) and rises up the ramp to the plateau (highlandLayout.ts).
export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }
export interface PlanarPoint { x: number; z: number }
export const CAMP: Rect = { minX: -WORLD_LIMIT, maxX: WORLD_LIMIT, minZ: -WORLD_LIMIT, maxZ: WORLD_LIMIT }
/** Overlaps the camp and the wetlands by half a metre so the union has no seam. */
export const NORTH_CORRIDOR: Rect = { minX: sz(-5.6), maxX: sz(-1.4), minZ: WORLD_LIMIT - 0.5, maxZ: sz(36.5) }
export const WETLAND: Rect = { minX: sz(-26), maxX: sz(12), minZ: sz(36), maxZ: sz(62) }
/** Spans the channel between the wetlands and the glade; overlaps both by half a metre. */
export const BRIDGE: Rect = { minX: sz(-4.6), maxX: sz(-2.4), minZ: sz(62) - 0.5, maxZ: sz(66) + 0.5 }
export const GLADE: Rect = { minX: sz(-11), maxX: sz(3), minZ: sz(66), maxZ: sz(75) }
/** Ramp from the glade up to the plateau; gated until the glade's finale has played. */
export const ASCENT: Rect = { minX: sz(-6), maxX: sz(-2), minZ: sz(75) - 0.5, maxZ: sz(100) + 0.5 }
export const HIGHLAND: Rect = { minX: sz(-26), maxX: sz(18), minZ: sz(100), maxZ: sz(134) }
/** Every region that shapes the terrain, gated or not. */
export const allRegions: readonly Rect[] = [CAMP, NORTH_CORRIDOR, WETLAND, BRIDGE, GLADE, ASCENT, HIGHLAND]
/** Frame-loop-owned gate state (not React state); the route system opens gates, the player reads them. */
export const gates = { north: false, bridge: false, ascent: false }
const combos = new Map<number, Rect[]>()
export function walkableRegions(northOpen = gates.north, bridgeOpen = gates.bridge, ascentOpen = gates.ascent): readonly Rect[] {
  const key = +northOpen | (+bridgeOpen << 1) | (+ascentOpen << 2)
  let rects = combos.get(key)
  if (!rects) {
    rects = [CAMP, WETLAND, GLADE, HIGHLAND, ...(northOpen ? [NORTH_CORRIDOR] : []), ...(bridgeOpen ? [BRIDGE] : []), ...(ascentOpen ? [ASCENT] : [])]
    combos.set(key, rects)
  }
  return rects
}
/** True on the light bridge once it exists; the player walks on it at y = 0 above the deep channel. */
export function onBridge(x: number, z: number) { return gates.bridge && rectDistance(x, z, BRIDGE) === 0 }

/** Euclidean distance from a point to a rectangle; 0 inside. */
export function rectDistance(x: number, z: number, r: Rect) {
  return Math.hypot(Math.max(r.minX - x, 0, x - r.maxX), Math.max(r.minZ - z, 0, z - r.maxZ))
}
/** Distance to the union of `rects`; 0 inside any of them. */
export function regionDistance(x: number, z: number, rects: readonly Rect[] = allRegions) {
  let d = Infinity
  for (const r of rects) d = Math.min(d, rectDistance(x, z, r))
  return d
}
/** Moves `point` to the nearest walkable position. Mutates `point`; returns true if it moved. */
export function clampToRegions(point: PlanarPoint, rects: readonly Rect[]) {
  let best: Rect | null = null, bestDistance = Infinity
  for (const r of rects) {
    const d = rectDistance(point.x, point.z, r)
    if (d === 0) return false
    if (d < bestDistance) { bestDistance = d; best = r }
  }
  if (!best) return false
  point.x = Math.max(best.minX, Math.min(best.maxX, point.x)); point.z = Math.max(best.minZ, Math.min(best.maxZ, point.z))
  return true
}
/** Bounds of every region, for sizing the ground mesh and the backdrop. */
export const worldBounds = allRegions.reduce((b, r) => ({ minX: Math.min(b.minX, r.minX), maxX: Math.max(b.maxX, r.maxX), minZ: Math.min(b.minZ, r.minZ), maxZ: Math.max(b.maxZ, r.maxZ) }),
  { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity })
