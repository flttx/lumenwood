import type { Scene, Vector3, WebGLRenderer } from 'three'
import type { InputState } from '../input/input'
import type { CameraRig } from '../camera/FollowCamera'
import { useGameStore } from '../../state/gameStore'
import { atmosphere, type TimeSetting } from '../rendering/timeOfDay'
import { soundscape, type SoundState } from '../audio/engine'
import { route } from '../features/route/progress'
import { flock } from '../features/route/flock'
import { gates } from '../world/regions'
/** Test/diagnostic hook: enabled in dev, or in any build with `?debug` in the URL. */
export const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')
export interface DebugSnapshot {
  phase: string; pointerLocked: boolean; position: [number, number]; velocity: [number, number]
  yaw: number; pitch: number; cameraDistance: number; drawCalls: number; triangles: number; timeBlend: number
  sound: SoundState; chimes: number; splashes: number; wetland: number; height: number; music: number; caption: string | null; endingCard: boolean; footsteps: number
  route: { carried: number; following: number; lit: number; northGate: boolean; bridge: boolean; finale: boolean; ascent: boolean; highland: boolean }
  /** Light seeds picked up and side-area secrets solved (third pass). */
  seeds: number; secrets: string[]
}
export interface DebugApi {
  snapshot: () => DebugSnapshot; teleport: (x: number, z: number) => void; setView: (yaw: number, pitch: number) => void
  setTimeOfDay: (time: TimeSetting) => void
  /** The live scene, for diagnosing rendering in the browser (debug builds only). */
  scene: Scene
  setQuality: (quality: 'low' | 'medium' | 'high') => void
}
declare global { interface Window { __lumenwood?: DebugApi } }
export function installDebugApi(deps: { input: InputState; position: Vector3; velocity: Vector3; rig: CameraRig; gl: WebGLRenderer; scene: Scene }) {
  if (!debugEnabled) return () => {}
  const { input, position, velocity, rig, gl, scene } = deps
  window.__lumenwood = {
    snapshot: () => {
      const { phase, pointerLocked } = useGameStore.getState()
      return { phase, pointerLocked, position: [position.x, position.z], velocity: [velocity.x, velocity.z], yaw: input.yaw, pitch: input.pitch, cameraDistance: rig.distance, drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles, timeBlend: atmosphere.blend, sound: soundscape.state, chimes: soundscape.chimes, splashes: soundscape.splashes, wetland: atmosphere.wetland, height: position.y, music: soundscape.layers, footsteps: soundscape.footsteps,
        caption: useGameStore.getState().caption?.text ?? null, endingCard: useGameStore.getState().endingCard, seeds: route.seedsAt.size, secrets: [...route.secretsAt.keys()],
        route: { carried: route.carried, following: flock.following, lit: route.litAt.filter(t => t !== null).length, northGate: gates.north, bridge: gates.bridge, finale: route.finaleAt !== null, ascent: gates.ascent, highland: route.completedAt.highland !== null } }
    },
    teleport: (x, z) => { position.set(x, 0, z); velocity.set(0, 0, 0) },
    setView: (yaw, pitch) => { input.yaw = yaw; input.pitch = pitch },
    setTimeOfDay: time => useGameStore.getState().setTimeOfDay(time),
    scene,
    setQuality: quality => useGameStore.getState().setQuality(quality),
  }
  return () => { delete window.__lumenwood }
}
