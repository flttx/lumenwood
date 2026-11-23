import type { Vector3 } from 'three'
import { occludedDistance, type CylinderOccluder } from './occlusion'

/** Mutates the unit direction into the final lifted ray and checks its entire requested span, including cinematics. */
export function safeCameraArm(origin: Vector3, direction: Vector3, base: number, pull: number, lift: number, solids: readonly CylinderOccluder[], crowns: readonly CylinderOccluder[]) {
  direction.multiplyScalar(base + pull); direction.y += lift
  const requested = direction.length(); direction.divideScalar(Math.max(requested, 0.001))
  const solid = occludedDistance(origin, direction, requested, solids, 0.3)
  const crown = occludedDistance(origin, direction, requested, crowns, 0.3)
  // Very close foliage uses pixel fading; hard trunks always limit the camera.
  return Math.max(1.2, Math.min(solid, crown >= 2.8 ? crown : requested))
}
