import { smoothstep } from '../../shared/math'
import { inSunRect, SUN_MOAT } from './layout'

// Metre-scale distance approximations shared by terrain, bank dressing, grass and collision. The mouth of the bridge
// remains at the authored south bank; irregularity is reduced there so the deck joins stable, level ground.
function ellipseDistance(x: number, z: number, cx: number, cz: number, rx: number, rz: number) {
  return (Math.hypot((x - cx) / rx, (z - cz) / rz) - 1) * Math.min(rx, rz)
}
export function sunOuterDistance(x: number, z: number) {
  const angle = Math.atan2((z + 2.8) / 10.6, (x - 24) / 7.4)
  const scallop = (Math.sin(angle * 3 + 0.7) * 0.24 + Math.sin(angle * 7 - 0.4) * 0.13) * smoothstep(-12, -7, z)
  return ellipseDistance(x, z, 24, -2.8, 7.4, 10.6) - scallop
}
export function sunIslandDistance(x: number, z: number) {
  const angle = Math.atan2((z + 1.4) / 5.2, (x - 24) / 4.5)
  return ellipseDistance(x, z, 24, -1.4, 4.5, 5.2) + Math.sin(angle * 3 + 0.9) * 0.3 + Math.sin(angle * 7 - 0.5) * 0.13
}
/** Positive inside the dry gap, negative on either bank. Far outside the bounding rectangle needs no geometry work. */
export function sunRavineGap(x: number, z: number) {
  if (!inSunRect(x, z, SUN_MOAT, 1)) return -Infinity
  return Math.min(-sunOuterDistance(x, z), sunIslandDistance(x, z))
}
export function sunRavineDepth(x: number, z: number) {
  const gap = sunRavineGap(x, z)
  if (gap <= 0) return 0
  const bed = 2.65 + Math.sin(x * 1.3 + z * 0.35) * Math.sin(z * 0.8) * 0.18
  return bed * smoothstep(0, 1.4, gap)
}
