import { ANCIENT_TREE, highlandPath } from './highlandLayout'

/** Low planting in the approach's viewing corridor leaves the player and ancient roots readable during the pullback. */
export function inTreeApproachView(x: number, z: number, radius = 0) {
  const approach = highlandPath[highlandPath.length - 2]
  const start = approach[1] - 15, end = ANCIENT_TREE[1] - 15
  if (z < start || z > end) return false
  const t = (z - start) / (end - start), centre = approach[0] + (ANCIENT_TREE[0] - approach[0]) * t
  return Math.abs(x - centre) < 3.5 + radius
}
