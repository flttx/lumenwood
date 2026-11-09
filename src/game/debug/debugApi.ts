import type { Vector3, WebGLRenderer } from 'three'
import type { InputState } from '../input/input'
import type { CameraRig } from '../camera/FollowCamera'
import { useGameStore } from '../../state/gameStore'
/** Test/diagnostic hook: enabled in dev, or in any build with `?debug` in the URL. */
export const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')
export interface DebugSnapshot {
  phase: string; pointerLocked: boolean; position: [number, number]; velocity: [number, number]
  yaw: number; pitch: number; cameraDistance: number; drawCalls: number; triangles: number
}
export interface DebugApi { snapshot: () => DebugSnapshot; teleport: (x: number, z: number) => void; setView: (yaw: number, pitch: number) => void }
declare global { interface Window { __lumenwood?: DebugApi } }
export function installDebugApi(deps: { input: InputState; position: Vector3; velocity: Vector3; rig: CameraRig; gl: WebGLRenderer }) {
  if (!debugEnabled) return () => {}
  const { input, position, velocity, rig, gl } = deps
  window.__lumenwood = {
    snapshot: () => {
      const { phase, pointerLocked } = useGameStore.getState()
      return { phase, pointerLocked, position: [position.x, position.z], velocity: [velocity.x, velocity.z], yaw: input.yaw, pitch: input.pitch, cameraDistance: rig.distance, drawCalls: gl.info.render.calls, triangles: gl.info.render.triangles }
    },
    teleport: (x, z) => { position.set(x, 0, z); velocity.set(0, 0, 0) },
    setView: (yaw, pitch) => { input.yaw = yaw; input.pitch = pitch },
  }
  return () => { delete window.__lumenwood }
}
