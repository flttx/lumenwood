import type { BoxCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
import { at, sz } from '../scale'
// Forest camp: ARC-001 cabin in a clearing with its door turned toward the spawn point, INT-001 flowers along the way.
// Positions are authored at the original size and scaled with the world (scale.ts); trees keep clear of them (forestLayout).
const CABIN_X = sz(14), CABIN_Z = sz(-14)
export const cabin = { x: CABIN_X, z: CABIN_Z, angle: Math.atan2(-CABIN_X, -CABIN_Z) }
// ARC-001 measures 5.23 × 4.86 m (x × z) at 5 m tall; the collider trims the eaves so the player can stand under them.
export const cabinCollider: BoxCollider = { ...cabin, halfX: 2.3, halfZ: 2.1 }
// Approximation: a cylinder inscribed in the walls, so the camera pulls in when the cabin body is in the way.
export const cabinOccluder: CylinderOccluder = { x: CABIN_X, z: CABIN_Z, radius: 2.1, height: 5 }
// Lantern beside the door in the cabin's local frame (door faces local +Z), read off the reference front view:
// 0.94 m right of the door axis, 2.15 m up, just proud of the front wall.
export const LANTERN_OFFSET: [number, number, number] = [0.94, 2.15, 2.6]
export const glowFlowers = [[2.5, -3], [-3, 2.2], [-1, 5.2], [10.2, -10.6], [9.4, -15.6], [17.4, -10]].map(p => at(p)).map(([x, z], i) => ({ x, z, angle: i * 2.39996 }))
