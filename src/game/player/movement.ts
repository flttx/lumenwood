import { WORLD_SCALE } from '../world/scale'
/** Half-size of the camp square (authored 22 m, scaled with the world). */
export const WORLD_LIMIT = 22 * WORLD_SCALE
export const WALK_SPEED = 3.8
export const RUN_SPEED = 7
export const PLAYER_RADIUS = 0.35
export function movementAxis(keys: Set<string>) {
  let x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))
  let z = Number(keys.has('KeyS')) - Number(keys.has('KeyW'))
  const length = Math.hypot(x, z)
  if (length) { x /= length; z /= length }
  return { x, z }
}
/** Frame-rate independent exponential smoothing factor. */
export function dampFactor(rate: number, dt: number) { return 1 - Math.exp(-rate * dt) }
export function wrapAngle(angle: number) { return Math.atan2(Math.sin(angle), Math.cos(angle)) }
/** Rotates `current` toward `target` along the shortest arc. */
export function dampAngle(current: number, target: number, rate: number, dt: number) { return current + wrapAngle(target - current) * dampFactor(rate, dt) }
