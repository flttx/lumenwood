import type { CircleCollider } from '../../player/collision'
import { smoothstep } from '../../shared/math'
import { at, sz } from '../scale'
// Firefly Wetlands (P3): shallow pools the player can wade through, deep pools that block, and a deep channel along the
// north edge that only the light bridge crosses. Ground under water sinks below WATER_LEVEL; the water surface is a
// separate code mesh. Positions are provisional and checked by wetlandLayout.test.ts.
export const WATER_LEVEL = -0.05, SHALLOW_DEPTH = -0.38, DEEP_DEPTH = -1.4
export interface Pool { x: number; z: number; r: number; deep: boolean }
const authoredPath: [number, number][] = [[-3.3, 36.5], [-6, 42], [-4, 48], [-8, 53], [-5, 58], [-3.5, 62]]
const authoredPools: Pool[] = [
  { x: 2, z: 41, r: 4.5, deep: false }, { x: -12, z: 45, r: 5, deep: false }, { x: -1, z: 53, r: 3.8, deep: false },
  { x: -15, z: 56.5, r: 4.2, deep: false }, { x: 5, z: 58, r: 3.6, deep: false }, { x: -20, z: 39.5, r: 3.8, deep: false },
  { x: 8, z: 48, r: 4.5, deep: true }, { x: -20, z: 50, r: 4, deep: true }, { x: -23, z: 59, r: 3.2, deep: true }, { x: -9.5, z: 60, r: 2.6, deep: true },
]
/** Brooks: two small shallow pools the wetland trail crosses, each spanned by an ARC-002 bridge (sceneryLayout). */
export const BROOK_RADIUS = 3.2
export const brookSegments = [1, 3] // wetland trail segments whose midpoints the brooks sit on (no lantern near either)
const brookCentres = brookSegments.map(i => [(authoredPath[i][0] + authoredPath[i + 1][0]) / 2, (authoredPath[i][1] + authoredPath[i + 1][1]) / 2].map(sz) as [number, number])
// Side areas (2026-11-12, world metres): the waterfall glen's plunge pool and the stream it feeds, and the mirror lake
// (a wide shallow lake you can wade, with deep holes and an island).
/** Plunge pool at the foot of the glen's waterfall. */
export const PLUNGE_POOL = { x: -121, z: 6, r: 7.5 }
export const LAKE_CENTRE: [number, number] = [-102, 122]
const sidePools: Pool[] = [
  { ...PLUNGE_POOL, deep: false },
  ...([[-112.5, 1.5, 3], [-108, 0, 3.2], [-100, -5, 3.4], [-91, -9, 3.1], [-82, -11, 2.9], [-74.5, -10, 2.4]] as const).map(([x, z, r]) => ({ x, z, r, deep: false })),
  { x: LAKE_CENTRE[0], z: LAKE_CENTRE[1], r: 24, deep: false },
  { x: -115, z: 140, r: 6, deep: true }, { x: -89, z: 103.5, r: 5.5, deep: true }, { x: -121, z: 106, r: 5, deep: true },
]
export const pools: Pool[] = [...authoredPools.map(p => ({ ...p, x: sz(p.x), z: sz(p.z), r: sz(p.r) })), ...brookCentres.map(([x, z]) => ({ x, z, r: BROOK_RADIUS, deep: false })), ...sidePools]
/** Dry islands inside pools: the water's ground rises back to 0 within `r`, shelving out over half as much again. */
export const islands = [{ x: -103, z: 124, r: 7 }]
/** Deep water band between the wetlands and the hidden glade (authored z 62–66, scaled); shores slope over CHANNEL_SHORE metres. */
export const CHANNEL = { minX: sz(-32), maxX: sz(18), minZ: sz(63), maxZ: sz(65) }, CHANNEL_SHORE = sz(0.8)
/** Shore wobble: each pool's radius varies with direction by up to ±20 %, so pools read as natural rather than round. */
export function shoreScale(index: number, angle: number) { return 1 + 0.13 * Math.sin(3 * angle + index * 1.7) + 0.07 * Math.sin(5 * angle + index * 2.9) }
/** Deep pools block the player well before the slope gets deeper than wading depth, whichever way the shore wobbles. */
export const deepPoolColliders: CircleCollider[] = pools.filter(p => p.deep).map(p => ({ x: p.x, z: p.z, radius: p.r }))
/** Trail from the corridor through the wetlands to the start of the light bridge. */
export const wetlandPath: [number, number][] = authoredPath.map(at)
export const wetlandFlowers = ([[-8.5, 39], [1, 47.5], [-14, 50.5], [0.3, 57.6], [9.5, 53.5], [-22, 44.5]] as const).map(at)
/** Glade beyond the channel: a ring of flowers around the place where the route ends. */
export const GLADE_CENTRE: [number, number] = at([-4, 70.5])
export const gladeFlowers = Array.from({ length: 5 }, (_, i) => {
  const a = (i / 5) * Math.PI * 2 + 0.3
  return [GLADE_CENTRE[0] + Math.cos(a) * sz(3.2), GLADE_CENTRE[1] + Math.sin(a) * sz(3.2)]
})

/** Channel banks at `x`: they only wobble inward (up to 0.8 m), so the walkable shore never gets deeper. */
export function channelBanks(x: number): [number, number] {
  return [CHANNEL.minZ + sz(0.4) * (1 + Math.sin(x * 0.18)), CHANNEL.maxZ - sz(0.4) * (1 + Math.sin(x * 0.15 + 1.3))]
}
/** Ground offset below 0 from pools and the channel (0 on dry ground). */
export function basinDepth(x: number, z: number) {
  let depth = 0
  pools.forEach((p, i) => {
    const d = Math.hypot(x - p.x, z - p.z) / shoreScale(i, Math.atan2(z - p.z, x - p.x))
    if (d < p.r) depth = Math.min(depth, (p.deep ? DEEP_DEPTH : SHALLOW_DEPTH) * smoothstep(p.r, p.r * 0.55, d))
  })
  for (const i of islands) depth *= smoothstep(i.r, i.r * 1.5, Math.hypot(x - i.x, z - i.z))
  if (x > CHANNEL.minX && x < CHANNEL.maxX) {
    const [south, north] = channelBanks(x), out = Math.max(south - z, z - north, 0), fade = Math.min(x - CHANNEL.minX, CHANNEL.maxX - x, 6) / 6
    if (out < CHANNEL_SHORE) depth = Math.min(depth, DEEP_DEPTH * (1 - smoothstep(0, CHANNEL_SHORE, out)) * fade)
  }
  return depth || 0 // an island scales a negative depth to -0; callers compare with 0
}
/** True where the player's feet are in water: the ground there is a pool or the channel (rolling dry ground elsewhere can
 *  dip below the waterline without being wet) and the feet are below the surface (not up on a bridge deck). */
export function wading(x: number, footY: number, z: number, depth = 0.04) {
  return footY < WATER_LEVEL - depth && basinDepth(x, z) < WATER_LEVEL - depth
}
