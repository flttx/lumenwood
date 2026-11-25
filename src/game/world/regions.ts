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
export const NORTH_CORRIDOR: Rect = { minX: sz(-6.2), maxX: sz(-1.0), minZ: WORLD_LIMIT - 0.5, maxZ: sz(36.5) }
export const WETLAND: Rect = { minX: sz(-26), maxX: sz(12), minZ: sz(36), maxZ: sz(62) }
/** Spans the channel between the wetlands and the glade; overlaps both by half a metre. */
export const BRIDGE: Rect = { minX: sz(-4.6), maxX: sz(-2.4), minZ: sz(62) - 0.5, maxZ: sz(66) + 0.5 }
export const GLADE: Rect = { minX: -42, maxX: 22, minZ: sz(66), maxZ: sz(75) }
/** Ramp from the glade up to the plateau; gated until the glade's finale has played. */
export const ASCENT: Rect = { minX: sz(-7.2), maxX: sz(-0.8), minZ: sz(75) - 0.5, maxZ: sz(100) + 0.5 }
export const HIGHLAND: Rect = { minX: -98, maxX: 58, minZ: sz(100), maxZ: sz(134) }
// Side areas & wide coastal/forest meadows (expanded 2026-11-25 so players can roam freely without tight invisible walls).
/** Waterfall glen west of the camp: a broad valley with a stream running from a plunge pool under a cliff waterfall. */
export const GLEN_PASS: Rect = { minX: -70.5, maxX: -WORLD_LIMIT + 0.5, minZ: -14, maxZ: 24 }
export const GLEN: Rect = { minX: -128, maxX: -70, minZ: -52, maxZ: 38 }
/** Mushroom hollow east of the camp: a deep stand of redwoods over giant glowing mushrooms. */
export const HOLLOW_PASS: Rect = { minX: WORLD_LIMIT - 0.5, maxX: 70.5, minZ: -36, maxZ: -12 }
export const HOLLOW: Rect = { minX: 70, maxX: 132, minZ: -66, maxZ: 2 }
/** Mirror lake west of the wetlands: a wide shallow lake with generous lakeside meadows and an island. */
export const LAKE_PASS: Rect = { minX: -75.5, maxX: sz(-26) + 0.5, minZ: 102, maxZ: 144 }
export const LAKE: Rect = { minX: -148, maxX: -75, minZ: 88, maxZ: 164 }
/** Cliff overlook east of the highland plateau: the land falls away beyond it, opening a view over the forest and sea. */
export const OVERLOOK_PASS: Rect = { minX: 57.5, maxX: 62.5, minZ: 280, maxZ: 320 }
export const OVERLOOK: Rect = { minX: 62, maxX: 92, minZ: 266, maxZ: 330 }
/** Crescent cove south of the camp: a wide sandy beach down to the waterline, flanked by coastal woodland loops. */
export const BEACH: Rect = { minX: -46, maxX: 46, minZ: -86, maxZ: -WORLD_LIMIT + 0.5 }
/** Southwest coastal woods connecting Waterfall Glen directly to Crescent Cove Beach. */
export const WEST_COVE_WOODS: Rect = { minX: -112, maxX: -45.5, minZ: -68, maxZ: -51.5 }
/** Southeast pine slope connecting Crescent Cove Beach directly to Mushroom Hollow. */
export const EAST_COVE_WOODS: Rect = { minX: 45.5, maxX: 116, minZ: -68, maxZ: -55.5 }
// Interconnected side-area loops + interior/coastal zones.
/** West ridge valley connecting the waterfall glen's north end directly to the mirror lake (opens with north gate). */
export const GLEN_LAKE_TRAIL: Rect = { minX: -114, maxX: -84, minZ: 37.5, maxZ: 88.5 }
/** Sunstone Vale east of the wetlands: an airy birch sanctuary with glowing stone pillars. */
export const VALE_PASS: Rect = { minX: 29.5, maxX: 48.5, minZ: 94, maxZ: 138 }
export const VALE: Rect = { minX: 48, maxX: 128, minZ: 88, maxZ: 160 }
/** East woodland shortcut connecting the mushroom hollow to the sunstone vale (opens with north gate). */
export const HOLLOW_VALE_TRAIL: Rect = { minX: 88, maxX: 116, minZ: 1.5, maxZ: 88.5 }
/** East highland return ridge descending gently from the cliff overlook back into the vale (opens with ascent gate). */
export const EAST_RIDGE_TRAIL: Rect = { minX: 64, maxX: 90, minZ: 159.5, maxZ: 266.5 }
/** Tidewater Reef south of the crescent cove: a broad sandspit and stepping-stone causeway out to a coastal terrace. */
export const REEF_CAUSEWAY: Rect = { minX: -7.5, maxX: 7.5, minZ: -108.5, maxZ: -85.5 }
export const REEF: Rect = { minX: -24, maxX: 24, minZ: -128, maxZ: -108 }
/** Starlight Terrace north of the ancient tree plateau: a wide northern cliff overlooking sea and aurora. */
export const STAR_PASS: Rect = { minX: -28, maxX: 10, minZ: 334.5, maxZ: 348.5 }
export const STAR_CLIFF: Rect = { minX: -62, maxX: 40, minZ: 348, maxZ: 374 }
export const sideRegions: readonly Rect[] = [
  GLEN_PASS, GLEN, HOLLOW_PASS, HOLLOW, LAKE_PASS, LAKE, OVERLOOK_PASS, OVERLOOK, BEACH,
  WEST_COVE_WOODS, EAST_COVE_WOODS,
  VALE_PASS, VALE, REEF_CAUSEWAY, REEF, STAR_PASS, STAR_CLIFF,
]
/** Every region that shapes the terrain, gated or not. */
export const allRegions: readonly Rect[] = [
  CAMP, NORTH_CORRIDOR, WETLAND, BRIDGE, GLADE, ASCENT, HIGHLAND,
  GLEN_LAKE_TRAIL, HOLLOW_VALE_TRAIL, EAST_RIDGE_TRAIL,
  ...sideRegions,
]
/** Frame-loop-owned gate state (not React state); the route system opens gates, the player reads them. */
export const gates = { north: false, bridge: false, ascent: false }
const combos = new Map<number, Rect[]>()
export function walkableRegions(northOpen = gates.north, bridgeOpen = gates.bridge, ascentOpen = gates.ascent): readonly Rect[] {
  const key = +northOpen | (+bridgeOpen << 1) | (+ascentOpen << 2)
  let rects = combos.get(key)
  if (!rects) {
    rects = [
      CAMP, WETLAND, GLADE, HIGHLAND, ...sideRegions,
      ...(northOpen ? [NORTH_CORRIDOR, GLEN_LAKE_TRAIL, HOLLOW_VALE_TRAIL] : []),
      ...(bridgeOpen ? [BRIDGE] : []),
      ...(ascentOpen ? [ASCENT, EAST_RIDGE_TRAIL] : []),
    ]
    combos.set(key, rects)
  }
  return rects
}
/** True on the light bridge once it exists; the player walks on its arched deck above the deep channel. */
export function onBridge(x: number, z: number) { return gates.bridge && rectDistance(x, z, BRIDGE) === 0 }
/** Rise of the light bridge's arch at its middle (metres); 0 at both ends, so it meets the banks. */
export const BRIDGE_ARCH = 0.9
/** Deck height of the light bridge at `z` (a half-sine arch along the bridge). */
export function bridgeDeck(z: number) {
  const t = Math.max(0, Math.min(1, (z - BRIDGE.minZ) / (BRIDGE.maxZ - BRIDGE.minZ)))
  return BRIDGE_ARCH * Math.sin(Math.PI * t)
}

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
