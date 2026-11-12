import type { CircleCollider } from '../../player/collision'
import { heightAt, nearestPathPoint } from '../../world/terrain/terrain'
import { ANCIENT_TREE, cradleSpots } from '../../world/zones/highlandLayout'
// Firefly route layout (docs/GAMEPLAY.md). Each zone has light nodes: INT-002 lantern posts beside the camp and wetland
// trails, INT-003 moss-stone cradles around the ancient tree. A zone's route runs through its nodes in order and ends at
// the gate it opens (the highland route ends at the tree itself). Values are provisional, tune by playtesting.
export type Zone = 'camp' | 'wetland' | 'highland'
export const ZONES: Zone[] = ['camp', 'wetland', 'highland']
export type NodeKind = 'post' | 'cradle'
export interface LanternSpot { zone: Zone; x: number; z: number; kind: NodeKind }
/** Fireflies needed to light one node, and how close (m) the player must stand. */
export const LANTERN_COST = 2, LANTERN_RANGE = 2
// INT-002 measures 0.62 × 1.9 × 0.57 m; its lantern hangs from an arm on the model's -X side, 0.19 m out and 1.3 m up.
export const LANTERN_ARM = 0.19, LANTERN_HEIGHT = 1.3, POST_RADIUS = 0.18
// INT-003 (0.77 × 1.3 × 0.77 m) leans, so its glowing hollow sits off-centre: (0.03, 1.2, -0.18) in model space,
// measured from the optimised mesh (see ASSET_MANIFEST).
export const CRADLE_HOLLOW: [number, number, number] = [0.03, 1.2, -0.18], CRADLE_RADIUS = 0.42
/** Nodes stand beside the trails (posts) or around the tree (cradles), clear of trunks, pools and flowers (see tests). */
export const lanterns: LanternSpot[] = [
  { zone: 'camp', x: -2.0, z: 7.2, kind: 'post' }, { zone: 'camp', x: -4.0, z: 13.0, kind: 'post' }, { zone: 'camp', x: -1.9, z: 19.4, kind: 'post' },
  { zone: 'wetland', x: -3.6, z: 42.6, kind: 'post' }, { zone: 'wetland', x: -7.4, z: 49.6, kind: 'post' }, { zone: 'wetland', x: -2.1, z: 59.4, kind: 'post' },
  ...cradleSpots.map(([x, z]) => ({ zone: 'highland' as const, x, z, kind: 'cradle' as const })),
]
/** Where each zone's route ends: the corridor mouth, the bridge foot, and the ancient tree's trunk. */
export const routeEnds: Record<Zone, [number, number]> = { camp: [-3.4, 24.5], wetland: [-3.5, 62.2], highland: ANCIENT_TREE }
/** Posts turn their arm toward the nearest trail point so the lantern hangs over the path; cradles face the tree. */
export const lanternPlacements = lanterns.map(spot => {
  const ground = heightAt(spot.x, spot.z)
  if (spot.kind === 'cradle') {
    const angle = Math.atan2(ANCIENT_TREE[0] - spot.x, ANCIENT_TREE[1] - spot.z), cos = Math.cos(angle), sin = Math.sin(angle)
    const [hx, hy, hz] = CRADLE_HOLLOW // rotated about +Y like Object3D.rotation.y
    return { ...spot, ground, angle, light: [spot.x + hx * cos + hz * sin, ground + hy, spot.z - hx * sin + hz * cos] as [number, number, number] }
  }
  const [fx, fz] = nearestPathPoint(spot.x, spot.z).point
  const dx = fx - spot.x, dz = fz - spot.z, length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length
  // Rotation about +Y that maps the model's -X axis onto (ux, uz): (-cos a, sin a) = (ux, uz).
  return { ...spot, ground, angle: Math.atan2(uz, -ux), light: [spot.x + ux * LANTERN_ARM, ground + LANTERN_HEIGHT, spot.z + uz * LANTERN_ARM] as [number, number, number] }
})
export const lanternColliders: CircleCollider[] = lanterns.map(l => ({ x: l.x, z: l.z, radius: l.kind === 'cradle' ? CRADLE_RADIUS : POST_RADIUS }))
export const zoneLanterns = (zone: Zone) => lanterns.flatMap((l, i) => (l.zone === zone ? [i] : []))
