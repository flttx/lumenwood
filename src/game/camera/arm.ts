import type { Vector3 } from 'three'
import { smoothstep } from '../shared/math'
import { occludedDistance, type CylinderOccluder } from './occlusion'

/** Mutates the unit direction into the final lifted ray and checks its entire requested span, including cinematics. */
export function safeCameraArm(origin: Vector3, direction: Vector3, base: number, pull: number, lift: number, solids: readonly CylinderOccluder[], crowns: readonly CylinderOccluder[]) {
  direction.multiplyScalar(base + pull); direction.y += lift
  const requested = direction.length(); direction.divideScalar(Math.max(requested, 0.001))
  const solid = occludedDistance(origin, direction, requested, solids, 0.3)
  const crown = occludedDistance(origin, direction, requested, crowns, 0.3)
  // Smoothly release canopy pull-in below 3.2 m (where pixel cameraFade takes over) so there is no jump cliff at 2.8 m.
  const canopyWeight = smoothstep(2.0, 3.2, crown)
  const canopyLimit = requested + (crown - requested) * canopyWeight
  return Math.max(1.2, Math.min(solid, canopyLimit))
}
