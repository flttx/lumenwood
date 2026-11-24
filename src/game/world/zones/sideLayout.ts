import type { CircleCollider } from '../../player/collision'
import type { SecretId } from '../../features/route/progress'
import { GLEN, HOLLOW, LAKE, OVERLOOK } from '../regions'
import { LAKE_CENTRE, PLUNGE_POOL, islands } from './wetlandLayout'
// Side areas (third pass, 2026-11-12 + map expansion 2026-11-24): landmarks, secrets and light seeds across optional zones.

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

/** Sunstone Vale (2026-11-24): four standing sunstone pillars ringing a shrine; light all four concurrently to wake it. */
export const VALE_HEART: [number, number] = [73, 126]
export const valeShrineCollider: CircleCollider = { x: VALE_HEART[0], z: VALE_HEART[1], radius: 1.7 }
export const VALE_RING_RADIUS = 15
export const valeStones = [0, 1, 2, 3].map(i => {
  const a = i * (Math.PI / 2) + Math.PI / 4
  return { x: +(VALE_HEART[0] + Math.cos(a) * VALE_RING_RADIUS).toFixed(2), z: +(VALE_HEART[1] + Math.sin(a) * VALE_RING_RADIUS).toFixed(2), angle: a + Math.PI }
})
export const valeColliders: CircleCollider[] = valeStones.map(s => ({ x: s.x, z: s.z, radius: 1.0 }))

/** Tidewater Reef (2026-11-24): sea-washed cairns and sandy stepping stones off the crescent cove. */
export const REEF_HEART: [number, number] = [0, -116]
export const reefCairns = ([[-11, -115], [0, -121], [11, -115]] as const).map(([x, z], i) => ({ x, z, angle: i * 2.1 + 0.4 }))
export const reefColliders: CircleCollider[] = reefCairns.map(c => ({ x: c.x, z: c.z, radius: 0.9 }))
export const reefSteppingStones = Array.from({ length: 8 }, (_, i) => ({ x: +(Math.sin(i * 0.9) * 0.65).toFixed(2), z: +(-87.5 - i * 2.75).toFixed(2), angle: i * 0.8 + 0.2 }))

/** Starlight Terrace (2026-11-24): northern stone shrine behind the ancient tree looking out over the sea and aurora. */
export const STAR_SHRINE: [number, number] = [-10, 365]
export const starShrineCollider: CircleCollider = { x: STAR_SHRINE[0], z: STAR_SHRINE[1], radius: 1.7 }

/** Light seeds: indices 0..11 remain fixed for v2 save compatibility; 12..15 belong to the 2026-11-24 expansion zones. */
export interface SeedSpot { x: number; z: number; secret?: SecretId }
export const seeds: SeedSpot[] = [
  { x: PLUNGE_POOL.x - 4, z: PLUNGE_POOL.z - 6.5, secret: 'glen' }, { x: -84, z: 24 }, { x: -120, z: -21 },
  { x: HOLLOW_HEART[0], z: HOLLOW_HEART[1], secret: 'hollow' }, { x: HOLLOW.maxX - 5, z: HOLLOW.maxZ - 5 },
  { x: SHRINE[0] + 2.4, z: SHRINE[1] - 1.5, secret: 'lake' }, { x: -90, z: LAKE.maxZ - 5 },
  { x: VISTA_POINT[0] - 1.5, z: VISTA_POINT[1] + 2, secret: 'overlook' },
  { x: 22, z: 0.5 }, { x: -17, z: -80 }, { x: 26, z: 145 }, { x: -58, z: 326 },
  { x: VALE_HEART[0] + 2.6, z: VALE_HEART[1], secret: 'vale' },
  { x: REEF_HEART[0], z: REEF_HEART[1] + 2.2, secret: 'reef' },
  { x: -97, z: 66 },
  { x: -10, z: 370.5 },
]
