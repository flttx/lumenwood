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

/** A point given in the cabin's local frame (x to the door's right, z out of the door), in world space. */
function besideCabin(lx: number, lz: number, turn = 0) {
  const cos = Math.cos(cabin.angle), sin = Math.sin(cabin.angle)
  return { x: CABIN_X + lx * cos + lz * sin, z: CABIN_Z - lx * sin + lz * cos, angle: cabin.angle + turn }
}
// Camp set dressing (scene enrichment, 2026-11-12): a fire pit off the path in front of the door with stump seats round
// it, supplies by the right wall and a woodpile along the left wall. Sizes come from the optimised meshes (ASSET_MANIFEST).
export const campfire = besideCabin(4.2, 7.5)
export const FIRE_RADIUS = 0.75, SEAT_DISTANCE = 2.1
export const campSeats = [0.6, 2.4, 4.1].map(a => ({ x: campfire.x + Math.cos(a) * SEAT_DISTANCE, z: campfire.z + Math.sin(a) * SEAT_DISTANCE, angle: a * 1.7 }))
export const campCrates = besideCabin(3.55, 1.0, 0.25)
export const woodpile = besideCabin(-3.3, -0.2, Math.PI / 2)
export const CRATES_HALF: [number, number] = [0.82, 0.54], WOODPILE_HALF: [number, number] = [0.97, 0.6]
export const campBoxColliders: BoxCollider[] = [
  { ...campCrates, halfX: CRATES_HALF[0], halfZ: CRATES_HALF[1] },
  { ...woodpile, halfX: WOODPILE_HALF[0], halfZ: WOODPILE_HALF[1] },
]
export const campCircleColliders = [{ x: campfire.x, z: campfire.z, radius: FIRE_RADIUS }, ...campSeats.map(s => ({ x: s.x, z: s.z, radius: 0.32 }))]
/** Ground kept clear of grass and undergrowth around the camp set. */
export const campClearings = [{ x: campfire.x, z: campfire.z, r: 3.2 }, { x: campCrates.x, z: campCrates.z, r: 1.2 }, { x: woodpile.x, z: woodpile.z, r: 1.4 }]
