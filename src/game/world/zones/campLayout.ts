import type { BoxCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
// Forest camp: ARC-001 cabin in a clearing with its door turned toward the spawn point, INT-001 flowers along the way.
// Positions were checked against forestLayout: the nearest trunk is 7.8 m from the cabin centre, 1.7 m from any flower.
const CABIN_X = 14, CABIN_Z = -14
export const cabin = { x: CABIN_X, z: CABIN_Z, angle: Math.atan2(-CABIN_X, -CABIN_Z) }
// ARC-001 measures 5.23 × 4.86 m (x × z) at 5 m tall; the collider trims the eaves so the player can stand under them.
export const cabinCollider: BoxCollider = { ...cabin, halfX: 2.3, halfZ: 2.1 }
// Approximation: a cylinder inscribed in the walls, so the camera pulls in when the cabin body is in the way.
export const cabinOccluder: CylinderOccluder = { x: CABIN_X, z: CABIN_Z, radius: 2.1, height: 5 }
export const glowFlowers = [[2.5, -3], [-3, 2.2], [-1, 5.2], [10.2, -10.6], [9.4, -15.6], [17.4, -10]].map(([x, z], i) => ({ x, z, angle: i * 2.39996 }))
