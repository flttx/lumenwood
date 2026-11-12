import type { CircleCollider } from '../../player/collision'
import { nearestPathPoint } from '../../world/terrain/terrain'
// Firefly route layout (P3 draft, docs/GAMEPLAY.md). INT-002 lantern posts stand beside the trails; a zone's route runs
// through its lanterns in order and ends at the gate it opens. Values are provisional, tune by playtesting.
export type Zone = 'camp' | 'wetland'
export interface LanternSpot { zone: Zone; x: number; z: number }
/** Fireflies needed to light one lantern, and how close (m) the player must stand. */
export const LANTERN_COST = 2, LANTERN_RANGE = 2
// INT-002 measures 0.62 × 1.9 × 0.57 m; its lantern hangs from an arm on the model's -X side, 0.19 m out and 1.3 m up.
export const LANTERN_ARM = 0.19, LANTERN_HEIGHT = 1.3, POST_RADIUS = 0.18
/** Lanterns stand beside the trails, 1–2 m off the centreline and clear of trunks, pools and flowers (see tests). */
export const lanterns: LanternSpot[] = [
  { zone: 'camp', x: -2.0, z: 7.2 }, { zone: 'camp', x: -4.0, z: 13.0 }, { zone: 'camp', x: -1.9, z: 19.4 },
  { zone: 'wetland', x: -3.6, z: 42.6 }, { zone: 'wetland', x: -7.4, z: 49.6 }, { zone: 'wetland', x: -2.1, z: 59.4 },
]
/** Where each zone's route ends: the camp route clears the mist at the corridor mouth, the wetland route raises the bridge. */
export const routeEnds: Record<Zone, [number, number]> = { camp: [-3.4, 24.5], wetland: [-3.5, 62.2] }
/** The arm turns toward the nearest trail point so the lantern hangs over the path. */
export const lanternPlacements = lanterns.map(spot => {
  const [fx, fz] = nearestPathPoint(spot.x, spot.z).point
  const dx = fx - spot.x, dz = fz - spot.z, length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length
  // Rotation about +Y that maps the model's -X axis onto (ux, uz): (-cos a, sin a) = (ux, uz).
  return { ...spot, angle: Math.atan2(uz, -ux), light: [spot.x + ux * LANTERN_ARM, LANTERN_HEIGHT, spot.z + uz * LANTERN_ARM] as [number, number, number] }
})
export const lanternColliders: CircleCollider[] = lanterns.map(l => ({ x: l.x, z: l.z, radius: POST_RADIUS }))
export const zoneLanterns = (zone: Zone) => lanterns.flatMap((l, i) => (l.zone === zone ? [i] : []))
