import { WORLD_LIMIT } from '../player/movement'
// Walkable area: a union of axis-aligned rectangles. The camp is the original square; a corridor leads north from the end
// of the camp trail to the wetlands. The corridor is shaped into the terrain from the start but only becomes walkable
// once its gate opens (the camp firefly route). Ground stays flat at y = 0 inside every region.
export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }
export interface PlanarPoint { x: number; z: number }
export const CAMP: Rect = { minX: -WORLD_LIMIT, maxX: WORLD_LIMIT, minZ: -WORLD_LIMIT, maxZ: WORLD_LIMIT }
/** Overlaps the camp and the wetlands by half a metre so the union has no seam. */
export const NORTH_CORRIDOR: Rect = { minX: -5.6, maxX: -1.4, minZ: WORLD_LIMIT - 0.5, maxZ: 36.5 }
export const WETLAND: Rect = { minX: -26, maxX: 12, minZ: 36, maxZ: 70 }
/** Every region that shapes the terrain, gated or not. */
export const allRegions: readonly Rect[] = [CAMP, NORTH_CORRIDOR, WETLAND]
/** Frame-loop-owned gate state (not React state); the route system opens gates, the player reads them. */
export const gates = { north: false }
const open: Rect[] = [CAMP, NORTH_CORRIDOR, WETLAND], closed: Rect[] = [CAMP, WETLAND]
export function walkableRegions(northOpen = gates.north): readonly Rect[] { return northOpen ? open : closed }

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
