import type { CircleCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
import { heightAt, nearestPathPoint } from '../terrain/terrain'
import { CAMP, HIGHLAND, WETLAND, regionDistance, worldBounds } from '../regions'
import { cabin } from './campLayout'
import { ANCIENT_TREE, cradleSpots, rampRocks } from './highlandLayout'
import { basinDepth } from './wetlandLayout'
import { flowers } from './floraLayout'
import { lanterns } from '../../features/route/routeLayout'
import { random } from '../../shared/random'
// Deterministic tree layout shared by rendering, collision and camera occlusion (scene upgrade, 2026-11-12). Three species:
// VEG-003 giant redwoods and VEG-004 tall firs make the towering canopy of the concept art; VEG-001 conifers are the young
// understory. Trunk radii and heights per species are measured from the optimised meshes (scale 1).
export type TreeKind = 'conifer' | 'redwood' | 'fir'
export const species: Record<TreeKind, { trunk: number; height: number; scale: [number, number] }> = {
  conifer: { trunk: 0.4, height: 4.8, scale: [1.3, 2.4] },
  redwood: { trunk: 2.2, height: 28, scale: [0.72, 1.12] },
  fir: { trunk: 0.75, height: 18, scale: [0.8, 1.25] },
}
export interface TreeSpot { x: number; z: number; scale: number; kind: TreeKind }
export const trunkRadius = (t: TreeSpot) => species[t.kind].trunk * t.scale
/** Walkable gap kept between neighbouring trunks (beyond both radii). */
export const TREE_GAP = 2.6
export const SPAWN_CLEARING = 9, CABIN_CLEARING = 11, TRAIL_CLEARANCE = 3.4

function pickKind(r: number, mix: [number, number]): TreeKind { return r < mix[0] ? 'redwood' : r < mix[0] + mix[1] ? 'fir' : 'conifer' }
/** Rejection sampling inside `area`: `ok` filters the ground, trunks never crowd each other or the trails. */
function plant(seed: number, count: number, area: { minX: number; maxX: number; minZ: number; maxZ: number }, mix: [number, number], ok: (x: number, z: number, radius: number) => boolean, existing: TreeSpot[] = []) {
  const rand = random(seed), out: TreeSpot[] = []
  for (let tries = 0; out.length < count && tries < count * 120; tries++) {
    const kind = pickKind(rand(), mix), [lo, hi] = species[kind].scale, scale = lo + rand() * (hi - lo)
    const x = area.minX + 2 + rand() * (area.maxX - area.minX - 4), z = area.minZ + 2 + rand() * (area.maxZ - area.minZ - 4)
    const tree = { x, z, scale, kind }, radius = trunkRadius(tree)
    if (nearestPathPoint(x, z).distance < TRAIL_CLEARANCE + radius || !ok(x, z, radius)) continue
    if ([...flowers, ...lanterns].some(s => Math.hypot(s.x - x, s.z - z) < 3 + radius)) continue
    if ([...existing, ...out].some(t => Math.hypot(t.x - x, t.z - z) < trunkRadius(t) + radius + TREE_GAP)) continue
    out.push(tree)
  }
  return out
}
/** The camp is a dense, tall forest with a clearing at the spawn point and around the cabin. */
export const CAMP_TREE_COUNT = 300
const campTrees = plant(11, CAMP_TREE_COUNT, CAMP, [0.22, 0.38],
  (x, z, r) => Math.hypot(x, z) > SPAWN_CLEARING + r && Math.hypot(x - cabin.x, z - cabin.z) > CABIN_CLEARING + r)
/** Sparser firs and young conifers on the wetland's dry ground, clear of water. */
export const WETLAND_TREE_COUNT = 40
export const wetlandTrees = plant(61, WETLAND_TREE_COUNT, WETLAND, [0.05, 0.4], (x, z, r) =>
  [[0, 0], [r + 1, 0], [-r - 1, 0], [0, r + 1], [0, -r - 1]].every(([dx, dz]) => basinDepth(x + dx, z + dz) === 0))
/** Plateau trees keep a wide ring of open ground around the ancient tree so it stands alone as the landmark. */
export const HIGHLAND_TREE_COUNT = 60
const cradles = cradleSpots.map(([x, z]) => ({ x, z }))
const highlandTrees = plant(83, HIGHLAND_TREE_COUNT, HIGHLAND, [0.3, 0.45], (x, z, r) =>
  Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]) > 22 + r && cradles.every(c => Math.hypot(c.x - x, c.z - z) > 4 + r))
export const forestTrees: TreeSpot[] = [...campTrees, ...wetlandTrees, ...highlandTrees]
/** PRP-001 clusters scattered on the plateau, clear of the tree, trail, flowers, cradles and trees; plus the ramp shoulders. */
export const ROCK_RADIUS = 0.95
export const highlandRocks = (() => {
  const rand = random(97), out: { x: number; z: number; scale: number; angle: number }[] = rampRocks.map(([x, z, scale], i) => ({ x, z, scale, angle: i * 1.9 }))
  const spots = [...flowers, ...cradles]
  for (let tries = 0, placed = 0; placed < 24 && tries < 6000; tries++) {
    const x = HIGHLAND.minX + 2 + rand() * (HIGHLAND.maxX - HIGHLAND.minX - 4), z = HIGHLAND.minZ + 2 + rand() * (HIGHLAND.maxZ - HIGHLAND.minZ - 4), scale = 0.9 + rand() * 1.4
    if (Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]) < 16 || nearestPathPoint(x, z).distance < 2.6 + ROCK_RADIUS * scale) continue
    if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 3.5) || highlandTrees.some(t => Math.hypot(t.x - x, t.z - z) < trunkRadius(t) + 3) || out.some(r => Math.hypot(r.x - x, r.z - z) < 4)) continue
    out.push({ x, z, scale, angle: rand() * Math.PI * 2 }); placed++
  }
  return out
})()
export const rockColliders: CircleCollider[] = highlandRocks.map(r => ({ x: r.x, z: r.z, radius: ROCK_RADIUS * r.scale }))
export const treeColliders: CircleCollider[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: trunkRadius(t) }))
export const treeOccluders: CylinderOccluder[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: trunkRadius(t), height: species[t.kind].height * t.scale * 0.6, base: heightAt(t.x, t.z) }))
/** Backdrop trees keep at least this far from any walkable region, so they never need colliders. */
export const OUTER_CLEARANCE = 3
const OUTER_STEP = 6.5, OUTER_NEAR = 9, OUTER_FAR = 18
// Unreachable backdrop on the hills around every region (corridor ridges included): hides the world edge with tall firs
// and redwoods. A jittered grid, dense next to the walkable area, thinning out further up the hills.
export const outerTrees = (() => {
  const rand = random(23), out: { x: number; y: number; z: number; scale: number; kind: TreeKind }[] = []
  for (let gx = worldBounds.minX - OUTER_FAR; gx <= worldBounds.maxX + OUTER_FAR; gx += OUTER_STEP) {
    for (let gz = worldBounds.minZ - OUTER_FAR; gz <= worldBounds.maxZ + OUTER_FAR; gz += OUTER_STEP) {
      const x = gx + (rand() - 0.5) * OUTER_STEP * 0.8, z = gz + (rand() - 0.5) * OUTER_STEP * 0.8, keep = rand(), kind: TreeKind = rand() < 0.35 ? 'redwood' : 'fir'
      const [lo, hi] = species[kind].scale, scale = lo + rand() * (hi - lo)
      const d = regionDistance(x, z)
      if (d < OUTER_CLEARANCE || d > OUTER_FAR || (d > OUTER_NEAR && keep < 0.55)) continue
      out.push({ x, y: heightAt(x, z), z, scale, kind })
    }
  }
  return out
})()
