import { smoothstep } from '../../shared/math'
import { inSunRect, SUN_CLEARING } from './layout'
import { sunRavineDepth } from './landform'

/** Level the interaction banks, then carve an irregular, rounded dry ravine. Terrain and collision share landform.ts. */
export function sunlightGround(x: number, z: number, original: number) {
  if (!inSunRect(x, z, SUN_CLEARING, 4)) return original
  const edge = Math.min(x - SUN_CLEARING.minX, SUN_CLEARING.maxX - x, z - SUN_CLEARING.minZ, SUN_CLEARING.maxZ - z)
  const flat = original * (1 - smoothstep(-4, 0, edge))
  return flat - sunRavineDepth(x, z)
}
