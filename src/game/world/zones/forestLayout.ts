import type { CircleCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
// Deterministic greybox layout shared by rendering, collision and camera occlusion.
export const TRUNK_BASE_RADIUS = 0.4
export const TREE_TOP = 4.8
export const forestTrees = Array.from({ length: 48 }, (_, i) => {
  const angle = i * 2.39996, radius = 7 + (i % 7) * 2.5
  return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, scale: 0.8 + (i % 4) * 0.16 }
})
export const treeColliders: CircleCollider[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: TRUNK_BASE_RADIUS * t.scale }))
export const treeOccluders: CylinderOccluder[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: TRUNK_BASE_RADIUS * t.scale, height: TREE_TOP * t.scale }))
