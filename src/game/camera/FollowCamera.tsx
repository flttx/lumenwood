import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { InputState } from '../input/input'
import { occludedDistance } from './occlusion'
import { dampFactor } from '../player/movement'
import { treeOccluders } from '../world/zones/forestLayout'
import { cabinOccluder } from '../world/zones/campLayout'
import { useGameStore } from '../../state/gameStore'
export const CAMERA_DISTANCE = 6.5
const PIVOT_HEIGHT = 1.25, MIN_DISTANCE = 1.2, CAMERA_PADDING = 0.3, RETURN_RATE = 3
const occluders = [...treeOccluders, cabinOccluder]
export interface CameraRig { distance: number }
export function FollowCamera({ input, position, rig }: { input: InputState; position: Vector3; rig: CameraRig }) {
  const pivot = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  useFrame(({ camera }, delta) => {
    if (useGameStore.getState().phase !== 'playing') return
    pivot.set(position.x, position.y + PIVOT_HEIGHT, position.z)
    const horizontal = Math.cos(input.pitch)
    dir.set(Math.sin(input.yaw) * horizontal, Math.sin(input.pitch), Math.cos(input.yaw) * horizontal)
    const allowed = Math.max(MIN_DISTANCE, occludedDistance(pivot, dir, CAMERA_DISTANCE, occluders, CAMERA_PADDING))
    // Pull in immediately so trunks never block the view; ease back out once clear.
    rig.distance = allowed < rig.distance ? allowed : rig.distance + (allowed - rig.distance) * dampFactor(RETURN_RATE, Math.min(delta, 0.1))
    camera.position.copy(pivot).addScaledVector(dir, rig.distance)
    camera.lookAt(pivot)
  })
  return null
}
