export const WORLD_LIMIT = 22
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
export function clampPosition(value: number) { return Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, value)) }
/** Frame-rate independent exponential smoothing factor. */
export function dampFactor(rate: number, dt: number) { return 1 - Math.exp(-rate * dt) }
export function wrapAngle(angle: number) { return Math.atan2(Math.sin(angle), Math.cos(angle)) }
/** Rotates `current` toward `target` along the shortest arc. */
export function dampAngle(current: number, target: number, rate: number, dt: number) { return current + wrapAngle(target - current) * dampFactor(rate, dt) }
