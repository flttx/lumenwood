import { SEA_LEVEL, heightAt, hillWeight, pathWeight } from '../world/terrain/terrain'
import { basinDepth } from '../world/zones/wetlandLayout'
import { worldBounds } from '../world/regions'
// Grass is code-generated terrain detail (user decision 2026-11-12; see task_plan). This bakes what the grass shader needs
// into a float field: ground height and grass density per cell. Pure, unit-tested; Grass.tsx uploads it as a texture.
export const FIELD_MARGIN = 24, FIELD_CELL = 1
export interface GrassField { minX: number; minZ: number; width: number; depth: number; cell: number; data: Float32Array }

/** Density 0–1: none on trails, in or at the edge of water, or where `clearings` say so; thinning up the hills. */
export function grassDensity(x: number, z: number, clearings: readonly { x: number; z: number; r: number }[] = []) {
  if (basinDepth(x, z) < -0.01 || heightAt(x, z) < SEA_LEVEL + 2.4) return 0 // no grass on the beach and sand
  let d = 1 - pathWeight(x, z)
  d *= 1 - Math.max(0, Math.min(1, (hillWeight(x, z) - 0.35) / 0.4))
  for (const c of clearings) d *= Math.min(1, Math.max(0, (Math.hypot(x - c.x, z - c.z) - c.r) / 1.5))
  return Math.max(0, Math.min(1, d))
}

/** RGBA float texels: R height, G density (B, A unused), row-major from (minX, minZ). */
export function bakeGrassField(clearings: readonly { x: number; z: number; r: number }[] = [], cell = FIELD_CELL): GrassField {
  const minX = worldBounds.minX - FIELD_MARGIN, minZ = worldBounds.minZ - FIELD_MARGIN
  const width = Math.ceil((worldBounds.maxX - worldBounds.minX + 2 * FIELD_MARGIN) / cell) + 1
  const depth = Math.ceil((worldBounds.maxZ - worldBounds.minZ + 2 * FIELD_MARGIN) / cell) + 1
  const data = new Float32Array(width * depth * 4)
  for (let j = 0; j < depth; j++) for (let i = 0; i < width; i++) {
    const x = minX + i * cell, z = minZ + j * cell, k = (j * width + i) * 4
    data[k] = heightAt(x, z); data[k + 1] = grassDensity(x, z, clearings)
  }
  return { minX, minZ, width, depth, cell, data }
}
