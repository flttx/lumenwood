import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import type { InputState } from '../input/input'
import { safeCameraArm } from './arm'
import { dampFactor, RUN_SPEED, WALK_SPEED } from '../player/movement'
import { highlandRocks, outerTreeOccluders, ROCK_RADIUS, treeOccluders } from '../world/zones/forestLayout'
import { treeCanopies } from './treeCanopies'
import { cabinOccluder } from '../world/zones/campLayout'
import { heightAt } from '../world/terrain/terrain'
import { deckHeight } from '../world/zones/sceneryLayout'
import { ANCIENT_TREE, PLATEAU_HEIGHT, treeOccluder } from '../world/zones/highlandLayout'
import { route, routeClock } from '../features/route/progress'
import { resonance } from '../features/resonance/resonance'
import { smoothstep } from '../shared/math'
import { useGameStore } from '../../state/gameStore'
import { SUN_BLOCKER, sunlightDeckHeight } from '../features/sunlight/layout'
export const CAMERA_DISTANCE = 6.5
const PIVOT_HEIGHT = 1.25, RETURN_RATE = 3, PIVOT_Y_RATE = 18, FOV_RATE = 5, GROUND_CLEARANCE = 0.5
const BASE_FOV = 50, SPRINT_FOV = 54, VISTA_FOV = 56
// Ending: for a while the camera eases back and its aim lifts toward the ancient tree's crown, so the gathering is in frame.
// The player keeps control of the yaw throughout.
const ENDING_PULL_BACK = 9, ENDING_AIM = 0.55, ENDING_HOLD = 18, CROWN = new Vector3(ANCIENT_TREE[0], PLATEAU_HEIGHT + 17, ANCIENT_TREE[1])
const rockOccluders = highlandRocks.map(r => ({ x: r.x, z: r.z, radius: ROCK_RADIUS * r.scale, height: 1.5 * r.scale, base: heightAt(r.x, r.z) }))
const occluders = [...treeOccluders, ...outerTreeOccluders, ...rockOccluders, cabinOccluder, treeOccluder, { ...SUN_BLOCKER, height: 2.1 }]
export interface CameraRig { distance: number }
/** A short cinematic beat other systems can start (the overlook's vista): for `hold` seconds from `at`, the camera eases
 *  back by `pull`, rises by `lift` and turns its aim toward `aim`; the player keeps the yaw. Frame-loop state. */
export const cameraMoment = { at: null as number | null, hold: 0, pull: 0, lift: 0, aim: new Vector3() }
const impulse = { target: 0, value: 0 }
/** Triggers a gentle, non-nauseating camera breath on key beats (lantern pulse, lighting, gate opening, seed pickup). */
export function cameraPulse(strength: number) {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  impulse.target = Math.max(impulse.target, Math.min(0.6, strength))
}
export function resetCameraMoment() {
  cameraMoment.at = null; cameraMoment.hold = 0; cameraMoment.pull = 0; cameraMoment.lift = 0; cameraMoment.aim.set(0, 0, 0)
  impulse.target = 0; impulse.value = 0
}
export function FollowCamera({ input, position, velocity, rig }: { input: InputState; position: Vector3; velocity?: Vector3; rig: CameraRig }) {
  const pivot = useMemo(() => new Vector3(position.x, position.y + PIVOT_HEIGHT, position.z), [position])
  const dir = useMemo(() => new Vector3(), [])
  const aim = useMemo(() => new Vector3(), [])
  const smoothY = useRef<number | null>(null)
  const smoothZoom = useRef(0)
  useFrame(({ camera }, delta) => {
    if (useGameStore.getState().phase !== 'playing') return
    const dt = Math.min(delta, 0.1)
    smoothZoom.current += (input.zoomOffset - smoothZoom.current) * dampFactor(10, dt)
    const targetY = position.y + PIVOT_HEIGHT
    // Smooth small vertical elevation steps (slopes, stones, bridges) while snapping across teleports.
    if (smoothY.current === null || Math.abs(targetY - smoothY.current) > 1.5) smoothY.current = targetY
    else smoothY.current += (targetY - smoothY.current) * dampFactor(PIVOT_Y_RATE, dt)
    pivot.set(position.x, smoothY.current, position.z)
    const horizontal = Math.cos(input.pitch)
    dir.set(Math.sin(input.yaw) * horizontal, Math.sin(input.pitch), Math.cos(input.yaw) * horizontal)
    const done = route.completedAt.highland, now = routeClock.now
    const cinematic = done === null ? 0 : smoothstep(done, done + 3, now) * (1 - smoothstep(done + ENDING_HOLD - 3, done + ENDING_HOLD, now))
    const m = cameraMoment.at, moment = m === null ? 0 : smoothstep(m, m + 2.5, now) * (1 - smoothstep(m + cameraMoment.hold - 2.5, m + cameraMoment.hold, now))
    // Event-only micro camera breathing: rises quickly toward impulse.target and relaxes softly (no walk/run bob).
    impulse.value += (impulse.target - impulse.value) * dampFactor(16, dt)
    impulse.target *= Math.exp(-6.5 * dt)
    // Shorten the camera arm when looking sharply upward so admiring tall redwoods, the Ancient Tree or stars clears the ground.
    const lookUp = smoothstep(-0.15, -0.78, input.pitch)
    const baseDistance = CAMERA_DISTANCE + smoothZoom.current * (1 - Math.max(cinematic, moment)) - 2.6 * lookUp * (1 - Math.max(cinematic, moment)) + 0.35 * impulse.value * (1 - cinematic)
    const allowed = safeCameraArm(pivot, dir, baseDistance, ENDING_PULL_BACK * cinematic + cameraMoment.pull * moment, cameraMoment.lift * moment, occluders, treeCanopies)
    rig.distance = allowed < rig.distance ? allowed : rig.distance + (allowed - rig.distance) * dampFactor(RETURN_RATE, dt)
    camera.position.copy(pivot).addScaledVector(dir, rig.distance)
    // Sample multiple points along the camera arm against terrain and bridge decks so hills/arches do not slice the view.
    let lift = 0
    const sunGrown = route.sunlight.grownAt !== null
    for (const frac of [0.5, 0.8, 1.0]) {
      const sx = pivot.x + dir.x * rig.distance * frac
      const sy = pivot.y + dir.y * rig.distance * frac
      const szPos = pivot.z + dir.z * rig.distance * frac
      const floor = Math.max(heightAt(sx, szPos), deckHeight(sx, szPos), sunlightDeckHeight(sx, szPos, sunGrown))
      const need = floor + GROUND_CLEARANCE - sy
      if (need > lift) lift = need
    }
    camera.position.y += lift
    if (cinematic > 0) aim.copy(pivot).lerp(CROWN, ENDING_AIM * cinematic)
    else if (moment > 0) aim.copy(pivot).lerp(cameraMoment.aim, 0.6 * moment)
    else { aim.copy(pivot); aim.y += lift } // preserve the requested look-up angle when the ground lifts the camera
    camera.lookAt(aim)
    // Subtle dynamic FOV: opens slightly during sprints and scenic beats without distorting exploration.
    if (camera instanceof PerspectiveCamera) {
      const speed = velocity ? Math.hypot(velocity.x, velocity.z) : 0
      const sprint = smoothstep(WALK_SPEED + 0.4, RUN_SPEED, speed)
      const flowLift = 2.4 * resonance.flow * smoothstep(0.5, WALK_SPEED, speed)
      const pulseFov = 1.6 * impulse.value
      const targetFov = Math.max(BASE_FOV + (SPRINT_FOV - BASE_FOV) * sprint + flowLift + pulseFov, BASE_FOV + (VISTA_FOV - BASE_FOV) * Math.max(cinematic, moment))
      const nextFov = camera.fov + (targetFov - camera.fov) * dampFactor(FOV_RATE, dt)
      if (Math.abs(nextFov - camera.fov) > 0.015) { camera.fov = nextFov; camera.updateProjectionMatrix() }
    }
  })
  return null
}
