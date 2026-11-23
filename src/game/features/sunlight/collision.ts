import type { PlanarPoint } from '../../player/collision'
import { SUN_BRIDGE } from './layout'
import { sunRavineGap } from './landform'

/** Project away from the same irregular edge that carves the ground. A grown bridge opens only its walkable width. */
export function pushOutOfSunRavine(point: PlanarPoint, radius: number, grown: boolean) {
  const gap = sunRavineGap(point.x, point.z)
  if (gap <= -radius) return false
  const b = SUN_BRIDGE, dx = point.x - b.x
  if (grown && point.z >= b.from && point.z <= b.to && Math.abs(dx) <= b.halfWidth + radius) {
    const half = b.halfWidth - radius
    if (Math.abs(dx) <= half) return false
    point.x = b.x + Math.sign(dx) * half
    return true
  }
  const e = 0.02
  for (let i = 0; i < 5; i++) {
    const d = sunRavineGap(point.x, point.z) + radius
    if (d <= 0.001) break
    const gx = (sunRavineGap(point.x + e, point.z) - sunRavineGap(point.x - e, point.z)) / (2 * e)
    const gz = (sunRavineGap(point.x, point.z + e) - sunRavineGap(point.x, point.z - e)) / (2 * e)
    const lengthSq = gx * gx + gz * gz
    if (lengthSq < 0.001 || !Number.isFinite(lengthSq)) break
    point.x -= gx * (d + 0.002) / lengthSq; point.z -= gz * (d + 0.002) / lengthSq
  }
  return true
}
