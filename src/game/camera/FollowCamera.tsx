import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { InputState } from '../input/input'
import { safeCameraArm } from './arm'
import { dampFactor } from '../player/movement'
import { treeOccluders } from '../world/zones/forestLayout'
import { treeCanopies } from './treeCanopies'
import { cabinOccluder } from '../world/zones/campLayout'
import { heightAt } from '../world/terrain/terrain'
import { ANCIENT_TREE, PLATEAU_HEIGHT, treeOccluder } from '../world/zones/highlandLayout'
import { route, routeClock } from '../features/route/progress'
import { smoothstep } from '../shared/math'
import { useGameStore } from '../../state/gameStore'
import { SUN_BLOCKER } from '../features/sunlight/layout'
export const CAMERA_DISTANCE = 6.5
const PIVOT_HEIGHT = 1.25, RETURN_RATE = 3, GROUND_CLEARANCE = 0.5
// Ending: for a while the camera eases back and its aim lifts toward the ancient tree's crown, so the gathering is in frame.
// The player keeps control of the yaw throughout.
const ENDING_PULL_BACK = 9, ENDING_AIM = 0.55, ENDING_HOLD = 18, CROWN = new Vector3(ANCIENT_TREE[0], PLATEAU_HEIGHT + 17, ANCIENT_TREE[1])
const occluders = [...treeOccluders, cabinOccluder, treeOccluder, { ...SUN_BLOCKER, height: 2.1 }]
export interface CameraRig { distance: number }
/** A short cinematic beat other systems can start (the overlook's vista): for `hold` seconds from `at`, the camera eases
 *  back by `pull`, rises by `lift` and turns its aim toward `aim`; the player keeps the yaw. Frame-loop state. */
export const cameraMoment = { at: null as number | null, hold: 0, pull: 0, lift: 0, aim: new Vector3() }
export function FollowCamera({ input, position, rig }: { input: InputState; position: Vector3; rig: CameraRig }) {
  const pivot = useMemo(() => new Vector3(), [])
  const dir = useMemo(() => new Vector3(), [])
  const aim = useMemo(() => new Vector3(), [])
  useFrame(({ camera }, delta) => {
    if (useGameStore.getState().phase !== 'playing') return
    pivot.set(position.x, position.y + PIVOT_HEIGHT, position.z)
    const horizontal = Math.cos(input.pitch)
    dir.set(Math.sin(input.yaw) * horizontal, Math.sin(input.pitch), Math.cos(input.yaw) * horizontal)
    const done = route.completedAt.highland, now = routeClock.now
    const cinematic = done === null ? 0 : smoothstep(done, done + 3, now) * (1 - smoothstep(done + ENDING_HOLD - 3, done + ENDING_HOLD, now))
    const m = cameraMoment.at, moment = m === null ? 0 : smoothstep(m, m + 2.5, now) * (1 - smoothstep(m + cameraMoment.hold - 2.5, m + cameraMoment.hold, now))
    // Include the entire cinematic extension and vertical lift in the ray, before deciding the safe arm length.
    const allowed = safeCameraArm(pivot, dir, CAMERA_DISTANCE, ENDING_PULL_BACK * cinematic + cameraMoment.pull * moment, cameraMoment.lift * moment, occluders, treeCanopies)
    rig.distance = allowed < rig.distance ? allowed : rig.distance + (allowed - rig.distance) * dampFactor(RETURN_RATE, Math.min(delta, 0.1))
    camera.position.copy(pivot).addScaledVector(dir, rig.distance)
    // Looking down a slope or across a hill, lift the camera clear of the ground instead of letting it sink in.
    const lift = Math.max(0, heightAt(camera.position.x, camera.position.z) + GROUND_CLEARANCE - camera.position.y)
    camera.position.y += lift
    if (cinematic > 0) aim.copy(pivot).lerp(CROWN, ENDING_AIM * cinematic)
    else if (moment > 0) aim.copy(pivot).lerp(cameraMoment.aim, 0.6 * moment)
    else { aim.copy(pivot); aim.y += lift } // preserve the requested look-up angle when the ground lifts the camera
    camera.lookAt(aim)
  })
  return null
}
