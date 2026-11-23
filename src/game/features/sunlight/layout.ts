import type { CircleCollider } from '../../player/collision'

// Small daytime gameplay sample, in world metres. Mirror faces and vines are explicitly TEMPORARY prototype art.
export const SUN_CLEARING = { minX: 8, maxX: 34, minZ: -21, maxZ: 9 }
export const SUN_MOAT = { minX: 15, maxX: 33, minZ: -14, maxZ: 9 }
export const SUN_ISLAND = { minX: 20, maxX: 28, minZ: -6, maxZ: 2 }
export const SUN_MIRRORS = [{ x: 13, z: -15 }, { x: 25, z: -15 }] as const
export const SUN_PLANT = { x: 25, z: 0 }
export const SUN_BLOCKER = { x: 13, z: -7, radius: 1.45 }
export const SUN_BRIDGE = { x: 22.5, halfWidth: 1.35, from: -14, to: -5 }
export const SUN_RETURN = { x: 14, z: -16 }
export const SUN_REWARD_INDEX = 8
export const SUN_REWARD = { x: 22, z: 0.5 }
export const SUN_HEIGHT = 1.4, SUN_REACH = 2.7, SUN_MAX_RAY = 24
export const inSunRect = (x: number, z: number, r: typeof SUN_CLEARING, margin = 0) =>
  x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin
export function sunlightReserved(x: number, z: number, radius = 0) { return inSunRect(x, z, SUN_CLEARING, radius + 1) }
export const sunlightCircles: CircleCollider[] = [...SUN_MIRRORS.map(m => ({ ...m, radius: 0.65 })), SUN_BLOCKER, { ...SUN_PLANT, radius: 0.4 }]
export function sunlightDeckHeight(x: number, z: number, grown: boolean) {
  if (!grown || Math.abs(x - SUN_BRIDGE.x) > SUN_BRIDGE.halfWidth || z < SUN_BRIDGE.from || z > SUN_BRIDGE.to) return -Infinity
  const t = (z - SUN_BRIDGE.from) / (SUN_BRIDGE.to - SUN_BRIDGE.from)
  return Math.sin(Math.PI * t) * 0.65
}
