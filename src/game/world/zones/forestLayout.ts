import type { CircleCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
import { heightAt } from '../terrain/terrain'
import { WORLD_LIMIT } from '../../player/movement'
// Deterministic greybox layout shared by rendering, collision and camera occlusion.
export const TRUNK_BASE_RADIUS = 0.4
export const TREE_TOP = 4.8
export const forestTrees = Array.from({ length: 48 }, (_, i) => {
  const angle = i * 2.39996, radius = 7 + (i % 7) * 2.5
  return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, scale: 0.8 + (i % 4) * 0.16 }
})
export const treeColliders: CircleCollider[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: TRUNK_BASE_RADIUS * t.scale }))
export const treeOccluders: CylinderOccluder[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: TRUNK_BASE_RADIUS * t.scale, height: TREE_TOP * t.scale }))
const OUTER_CLEARANCE = WORLD_LIMIT + 2.5
// Unreachable backdrop beyond the boundary: hides the world edge and gives the hills a tree line. No colliders needed.
// The play area is a square, so trees inside it (its corners reach 31 m from the centre) are dropped.
export const outerTrees = Array.from({ length: 130 }, (_, i) => {
  const angle = i * 2.39996 + 0.7, radius = 27 + (i % 9) * 2.6
  const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius
  return { x, y: heightAt(x, z), z, scale: 1 + (i % 5) * 0.14 }
}).filter(t => Math.max(Math.abs(t.x), Math.abs(t.z)) > OUTER_CLEARANCE)
