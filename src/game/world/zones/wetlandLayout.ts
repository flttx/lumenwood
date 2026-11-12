import type { CircleCollider } from '../../player/collision'
import { smoothstep } from '../../shared/math'
// Firefly Wetlands (P3): shallow pools the player can wade through, deep pools that block, and a deep channel along the
// north edge that only the light bridge crosses. Ground under water sinks below WATER_LEVEL; the water surface is a
// separate code mesh. Positions are provisional and checked by wetlandLayout.test.ts.
export const WATER_LEVEL = -0.05, SHALLOW_DEPTH = -0.38, DEEP_DEPTH = -1.4
export interface Pool { x: number; z: number; r: number; deep: boolean }
export const pools: Pool[] = [
  { x: 2, z: 41, r: 4.5, deep: false }, { x: -12, z: 45, r: 5, deep: false }, { x: -1, z: 53, r: 3.8, deep: false },
  { x: -15, z: 56.5, r: 4.2, deep: false }, { x: 5, z: 58, r: 3.6, deep: false }, { x: -20, z: 39.5, r: 3.8, deep: false },
  { x: 8, z: 48, r: 4.5, deep: true }, { x: -20, z: 50, r: 4, deep: true }, { x: -23, z: 59, r: 3.2, deep: true }, { x: -9.5, z: 60, r: 2.6, deep: true },
]
/** Deep water band between the wetlands (z ≤ 62) and the hidden glade (z ≥ 66); shores slope over CHANNEL_SHORE metres. */
export const CHANNEL = { minX: -32, maxX: 18, minZ: 63, maxZ: 65 }, CHANNEL_SHORE = 0.8
/** Shore wobble: each pool's radius varies with direction by up to ±20 %, so pools read as natural rather than round. */
export function shoreScale(index: number, angle: number) { return 1 + 0.13 * Math.sin(3 * angle + index * 1.7) + 0.07 * Math.sin(5 * angle + index * 2.9) }
/** Deep pools block the player well before the slope gets deeper than wading depth, whichever way the shore wobbles. */
export const deepPoolColliders: CircleCollider[] = pools.filter(p => p.deep).map(p => ({ x: p.x, z: p.z, radius: p.r * 0.95 }))
/** Trail from the corridor through the wetlands to the start of the light bridge. */
export const wetlandPath: [number, number][] = [[-3.3, 36.5], [-6, 42], [-4, 48], [-8, 53], [-5, 58], [-3.5, 62]]
export const wetlandFlowers = [[-8.5, 39], [1, 47.5], [-14, 50.5], [0.3, 57.6], [9.5, 53.5], [-22, 44.5]]
/** Glade beyond the channel: a ring of flowers around the place where the route ends. */
export const GLADE_CENTRE: [number, number] = [-4, 70.5]
export const gladeFlowers = Array.from({ length: 5 }, (_, i) => {
  const a = (i / 5) * Math.PI * 2 + 0.3
  return [GLADE_CENTRE[0] + Math.cos(a) * 3.2, GLADE_CENTRE[1] + Math.sin(a) * 3.2]
})

/** Channel banks at `x`: they only wobble inward (up to 0.8 m), so the walkable shore never gets deeper. */
export function channelBanks(x: number): [number, number] {
  return [CHANNEL.minZ + 0.4 * (1 + Math.sin(x * 0.45)), CHANNEL.maxZ - 0.4 * (1 + Math.sin(x * 0.37 + 1.3))]
}
/** Ground offset below 0 from pools and the channel (0 on dry ground). */
export function basinDepth(x: number, z: number) {
  let depth = 0
  pools.forEach((p, i) => {
    const d = Math.hypot(x - p.x, z - p.z) / shoreScale(i, Math.atan2(z - p.z, x - p.x))
    if (d < p.r) depth = Math.min(depth, (p.deep ? DEEP_DEPTH : SHALLOW_DEPTH) * smoothstep(p.r, p.r * 0.55, d))
  })
  if (x > CHANNEL.minX && x < CHANNEL.maxX) {
    const [south, north] = channelBanks(x), out = Math.max(south - z, z - north, 0), fade = Math.min(x - CHANNEL.minX, CHANNEL.maxX - x, 6) / 6
    if (out < CHANNEL_SHORE) depth = Math.min(depth, DEEP_DEPTH * (1 - smoothstep(0, CHANNEL_SHORE, out)) * fade)
  }
  return depth
}
