import type { CylinderOccluder } from './occlusion'
import { forestTrees, outerTrees, treeBase, type TreeKind } from '../world/zones/forestLayout'
// Measured from LOD0 vertex envelopes (2026-11-14). Raised, tapered bands avoid treating the space under a crown as a wall.
const bands: Record<TreeKind, readonly [number, number, number][]> = {
  conifer: [[0.9, 2.4, 1.2], [2.4, 4, 0.9], [4, 4.8, 0.5]],
  fir: [[3.5, 9, 3.1], [9, 13.5, 2.6], [13.5, 18, 1.2]],
  birch: [[5.5, 8.3, 2.7], [8.3, 11, 2.3]],
  redwood: [], // its high crown is well above the normal follow camera; the existing trunk proxy remains authoritative
}
export const treeCanopies: CylinderOccluder[] = [...forestTrees, ...outerTrees].flatMap(t => {
  if (!bands[t.kind].length) return []
  const base = 'y' in t && typeof t.y === 'number' ? t.y : treeBase(t)
  return bands[t.kind].map(([low, high, radius]) => ({ x: t.x, z: t.z, base: base + low * t.scale, height: (high - low) * t.scale, radius: radius * t.scale }))
})
