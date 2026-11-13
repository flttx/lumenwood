import type { CircleCollider } from '../../player/collision'
import { GLEN, HOLLOW, LAKE, OVERLOOK } from '../regions'
import { LAKE_CENTRE, PLUNGE_POOL, islands } from './wetlandLayout'
// Side areas (third pass, 2026-11-12): what stands in the waterfall glen, the mushroom hollow, the mirror lake and the
// cliff overlook, and where the twelve light seeds are hidden. World metres. Each area has one small secret
// (features/secrets): echo stones by the waterfall, giant mushrooms to wake, the island shrine, the overlook's vista.

/** The waterfall drops from the glen's west cliff into the plunge pool. */
/** `x` is the lip at the cliff's top edge; the water is thrown forward (east) and falls into the plunge pool. */
export const WATERFALL = { x: GLEN.minX - 3, z: PLUNGE_POOL.z, width: 6 }

/** Giant VEG-007 clusters in the hollow (x, z, scale); the player wakes each by standing under it. */
export const giantMushrooms = ([[80, -16, 8], [86, -47, 9], [101, -19, 7], [104, -45, 10], [94, -54, 7.5], [76, -41, 7], [107, -30, 8.5]] as const)
  .map(([x, z, scale], i) => ({ x, z, scale, angle: i * 2.3, radius: 0.24 * scale }))
export const mushroomColliders: CircleCollider[] = giantMushrooms.map(m => ({ x: m.x, z: m.z, radius: m.radius }))
/** Centre of the hollow's spore column (where its seed appears). */
export const HOLLOW_HEART: [number, number] = [92, -34]

/** Three echo stones round the plunge pool; the waterfall hums their notes in an order the player repeats. */
export const echoStones = ([[-107, 16], [-111, -7], [-123, 19]] as const).map(([x, z], i) => ({ x, z, note: i }))
export const echoColliders: CircleCollider[] = echoStones.map(s => ({ x: s.x, z: s.z, radius: 0.9 }))
export const ECHO_ORDER = [1, 2, 0] as const

/** Stepping stones across the lake's shallows from the east shore to the island; the shrine stands on the island. */
const island = islands[0]
export const fordStones = Array.from({ length: 6 }, (_, i) => ({ x: -80.5 - i * 2.75, z: LAKE_CENTRE[1] + Math.sin(i * 1.3) * 0.8, angle: i * 0.9 + 0.3 }))
export const SHRINE: [number, number] = [island.x, island.z]
export const shrineCollider: CircleCollider = { x: SHRINE[0], z: SHRINE[1], radius: 1.7 } // ARC-004 is 3.9 × 2.7 m

/** The overlook's edge, where standing still opens the vista. */
export const VISTA_POINT: [number, number] = [OVERLOOK.maxX - 3.5, 299]

/** Twelve light seeds: three rewards for the secrets, the rest tucked into corners off the trails. */
export interface SeedSpot { x: number; z: number; secret?: 'glen' | 'hollow' | 'lake' | 'overlook' }
export const seeds: SeedSpot[] = [
  { x: PLUNGE_POOL.x - 4, z: PLUNGE_POOL.z - 6.5, secret: 'glen' }, { x: -84, z: 24 }, { x: -120, z: -21 },
  { x: HOLLOW_HEART[0], z: HOLLOW_HEART[1], secret: 'hollow' }, { x: HOLLOW.maxX - 5, z: HOLLOW.maxZ - 5 },
  { x: SHRINE[0] + 2.4, z: SHRINE[1] - 1.5, secret: 'lake' }, { x: -90, z: LAKE.maxZ - 5 },
  { x: VISTA_POINT[0] - 1.5, z: VISTA_POINT[1] + 2, secret: 'overlook' },
  { x: 47, z: 44 }, { x: -17, z: -80 }, { x: 26, z: 145 }, { x: -58, z: 326 },
]
