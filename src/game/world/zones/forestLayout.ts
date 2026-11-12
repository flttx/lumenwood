import type { CircleCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
import { heightAt, nearestPathPoint } from '../terrain/terrain'
import { HIGHLAND, WETLAND, regionDistance, worldBounds } from '../regions'
import { ANCIENT_TREE, cradleSpots, rampRocks } from './highlandLayout'
import { basinDepth } from './wetlandLayout'
import { flowers } from './floraLayout'
import { lanterns } from '../../features/route/routeLayout'
import { random } from '../../shared/random'
// Deterministic greybox layout shared by rendering, collision and camera occlusion.
export const TRUNK_BASE_RADIUS = 0.4
export const TREE_TOP = 4.8
const campTrees = Array.from({ length: 48 }, (_, i) => {
  const angle = i * 2.39996, radius = 7 + (i % 7) * 2.5
  return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, scale: 0.8 + (i % 4) * 0.16 }
})
/** Sparser, smaller trees on the wetland's dry ground: clear of water, trails, flowers, lanterns and each other. */
export const WETLAND_TREE_COUNT = 16
export const wetlandTrees = (() => {
  const rand = random(61), out: { x: number; z: number; scale: number }[] = []
  for (let tries = 0; out.length < WETLAND_TREE_COUNT && tries < 4000; tries++) {
    const x = WETLAND.minX + 1.5 + rand() * (WETLAND.maxX - WETLAND.minX - 3), z = WETLAND.minZ + 2 + rand() * (WETLAND.maxZ - WETLAND.minZ - 3.5), scale = 0.7 + rand() * 0.45
    const dry = [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].every(([dx, dz]) => basinDepth(x + dx, z + dz) === 0)
    if (!dry || nearestPathPoint(x, z).distance < 2.4) continue
    if ([...flowers, ...lanterns].some(s => Math.hypot(s.x - x, s.z - z) < 2.6) || out.some(t => Math.hypot(t.x - x, t.z - z) < 3.4)) continue
    out.push({ x, z, scale })
  }
  return out
})()
/** Plateau trees keep a ring of open ground around the ancient tree so it stands alone as the landmark. */
export const HIGHLAND_TREE_COUNT = 14
const highlandTrees = (() => {
  const rand = random(83), out: { x: number; z: number; scale: number }[] = []
  for (let tries = 0; out.length < HIGHLAND_TREE_COUNT && tries < 4000; tries++) {
    const x = HIGHLAND.minX + 1.5 + rand() * (HIGHLAND.maxX - HIGHLAND.minX - 3), z = HIGHLAND.minZ + 2 + rand() * (HIGHLAND.maxZ - HIGHLAND.minZ - 3.5), scale = 0.85 + rand() * 0.5
    if (Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]) < 12 || nearestPathPoint(x, z).distance < 2.6) continue
    const spots = [...flowers, ...cradleSpots.map(([cx, cz]) => ({ x: cx, z: cz }))]
    if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 3) || out.some(t => Math.hypot(t.x - x, t.z - z) < 4)) continue
    out.push({ x, z, scale })
  }
  return out
})()
export const forestTrees = [...campTrees, ...wetlandTrees, ...highlandTrees]
/** PRP-001 clusters scattered on the plateau, clear of the tree, trail, flowers, cradles and trees; plus the ramp shoulders. */
export const ROCK_RADIUS = 0.95
export const highlandRocks = (() => {
  const rand = random(97), out: { x: number; z: number; scale: number; angle: number }[] = rampRocks.map(([x, z, scale], i) => ({ x, z, scale, angle: i * 1.9 }))
  const spots = [...flowers, ...cradleSpots.map(([cx, cz]) => ({ x: cx, z: cz })), ...highlandTrees]
  for (let tries = 0, placed = 0; placed < 12 && tries < 4000; tries++) {
    const x = HIGHLAND.minX + 2 + rand() * (HIGHLAND.maxX - HIGHLAND.minX - 4), z = HIGHLAND.minZ + 2 + rand() * (HIGHLAND.maxZ - HIGHLAND.minZ - 4), scale = 0.8 + rand() * 0.9
    if (Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]) < 13 || nearestPathPoint(x, z).distance < 2.4) continue
    if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 3) || out.some(r => Math.hypot(r.x - x, r.z - z) < 3.5)) continue
    out.push({ x, z, scale, angle: rand() * Math.PI * 2 }); placed++
  }
  return out
})()
export const rockColliders: CircleCollider[] = highlandRocks.map(r => ({ x: r.x, z: r.z, radius: ROCK_RADIUS * r.scale }))
export const treeColliders: CircleCollider[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: TRUNK_BASE_RADIUS * t.scale }))
export const treeOccluders: CylinderOccluder[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: TRUNK_BASE_RADIUS * t.scale, height: TREE_TOP * t.scale, base: heightAt(t.x, t.z) }))
/** Backdrop trees keep at least this far from any walkable region, so they never need colliders. */
export const OUTER_CLEARANCE = 2.5
const OUTER_STEP = 4.6, OUTER_NEAR = 8, OUTER_FAR = 17
// Unreachable backdrop on the hills around every region (corridor ridges included): hides the world edge. A jittered grid,
// dense next to the walkable area where it hides the edge, thinning out further up the hills.
export const outerTrees = (() => {
  const rand = random(23), out: { x: number; y: number; z: number; scale: number }[] = []
  for (let gx = worldBounds.minX - OUTER_FAR; gx <= worldBounds.maxX + OUTER_FAR; gx += OUTER_STEP) {
    for (let gz = worldBounds.minZ - OUTER_FAR; gz <= worldBounds.maxZ + OUTER_FAR; gz += OUTER_STEP) {
      const x = gx + (rand() - 0.5) * OUTER_STEP * 0.8, z = gz + (rand() - 0.5) * OUTER_STEP * 0.8, keep = rand(), scale = 1 + rand() * 0.6
      const d = regionDistance(x, z)
      if (d < OUTER_CLEARANCE || d > OUTER_FAR || (d > OUTER_NEAR && keep < 0.55)) continue
      out.push({ x, y: heightAt(x, z), z, scale })
    }
  }
  return out
})()
