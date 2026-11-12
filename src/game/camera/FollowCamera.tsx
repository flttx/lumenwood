import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { InputState } from '../input/input'
import { occludedDistance } from './occlusion'
import { dampFactor } from '../player/movement'
import { treeOccluders } from '../world/zones/forestLayout'
import { cabinOccluder } from '../world/zones/campLayout'
import { heightAt } from '../world/terrain/terrain'
import { ANCIENT_TREE, PLATEAU_HEIGHT, treeOccluder } from '../world/zones/highlandLayout'
import { route, routeClock } from '../features/route/progress'
import { smoothstep } from '../shared/math'
import { useGameStore } from '../../state/gameStore'
export const CAMERA_DISTANCE = 6.5
const PIVOT_HEIGHT = 1.25, MIN_DISTANCE = 1.2, CAMERA_PADDING = 0.3, RETURN_RATE = 3, GROUND_CLEARANCE = 0.5
// Ending: for a while the camera eases back and its aim lifts toward the ancient tree's crown, so the gathering is in frame.
// The player keeps control of the yaw throughout.
const ENDING_PULL_BACK = 9, ENDING_AIM = 0.55, ENDING_HOLD = 18, CROWN = new Vector3(ANCIENT_TREE[0], PLATEAU_HEIGHT + 17, ANCIENT_TREE[1])
const occluders = [...treeOccluders, cabinOccluder, treeOccluder]
export interface CameraRig { distance: number }
export function FollowCamera({ input, position, rig }: { input: InputState; position: Vector3; rig: CameraRig }) {
  const pivot = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  const aim = useMemo(() => new Vector3(), [])
  useFrame(({ camera }, delta) => {
    if (useGameStore.getState().phase !== 'playing') return
    pivot.set(position.x, position.y + PIVOT_HEIGHT, position.z)
    const horizontal = Math.cos(input.pitch)
    dir.set(Math.sin(input.yaw) * horizontal, Math.sin(input.pitch), Math.cos(input.yaw) * horizontal)
    const allowed = Math.max(MIN_DISTANCE, occludedDistance(pivot, dir, CAMERA_DISTANCE, occluders, CAMERA_PADDING))
    // Pull in immediately so trunks never block the view; ease back out once clear.
    rig.distance = allowed < rig.distance ? allowed : rig.distance + (allowed - rig.distance) * dampFactor(RETURN_RATE, Math.min(delta, 0.1))
    const done = route.completedAt.highland, now = routeClock.now
    const cinematic = done === null ? 0 : smoothstep(done, done + 3, now) * (1 - smoothstep(done + ENDING_HOLD - 3, done + ENDING_HOLD, now))
    camera.position.copy(pivot).addScaledVector(dir, rig.distance + ENDING_PULL_BACK * cinematic)
    // Looking down a slope or across a hill, lift the camera clear of the ground instead of letting it sink in.
    camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + GROUND_CLEARANCE)
    camera.lookAt(cinematic > 0 ? aim.copy(pivot).lerp(CROWN, ENDING_AIM * cinematic) : pivot)
  })
  return null
}
