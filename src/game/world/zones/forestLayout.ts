import type { CircleCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
import { groundUnder, heightAt, nearestPathPoint, paths, valueNoise } from '../terrain/terrain'
import { CAMP, HIGHLAND, WETLAND, regionDistance, worldBounds } from '../regions'
import { cabin } from './campLayout'
import { ANCIENT_TREE, cradleSpots, rampRocks } from './highlandLayout'
import { basinDepth } from './wetlandLayout'
import { flowers } from './floraLayout'
import { lanterns } from '../../features/route/routeLayout'
import { random } from '../../shared/random'
import { smoothstep } from '../../shared/math'
// Deterministic tree layout shared by rendering, collision and camera occlusion (scene upgrade, 2026-11-12). Three species:
// VEG-003 giant redwoods and VEG-004 tall firs make the towering canopy of the concept art; VEG-001 conifers are the young
// understory. Trunk radii and heights per species are measured from the optimised meshes (scale 1).
// Layout pass 2 (2026-11-12, the even scatter read as a plantation): low-frequency noise splits the land into dense stands
// and open, sunlit glades; redwoods grow in rings around a parent tree, as they do in nature; young conifers gather at
// stand edges and in the light along trails; and big "sentinel" trunks flank the trails at irregular intervals.
export type TreeKind = 'conifer' | 'redwood' | 'fir' | 'birch'
// `trunk` is the collision and spacing radius: the root flare where it is still knee to waist high (2026-11-12: measured
// from the meshes; the old values were the bare trunk, so the player walked into redwood and fir roots). `core` is the
// trunk proper, for camera occlusion. `spread` is the outermost root tip at ground level, used to seat the tree on slopes.
export const species: Record<TreeKind, { trunk: number; core: number; spread: number; height: number; scale: [number, number] }> = {
  conifer: { trunk: 0.4, core: 0.4, spread: 0.8, height: 4.8, scale: [1.3, 2.4] },
  redwood: { trunk: 3.5, core: 2.2, spread: 5, height: 28, scale: [0.72, 1.12] },
  fir: { trunk: 1.0, core: 0.75, spread: 2.1, height: 18, scale: [0.8, 1.25] },
  birch: { trunk: 0.36, core: 0.3, spread: 1.3, height: 11, scale: [0.8, 1.2] },
}
export interface TreeSpot { x: number; z: number; scale: number; kind: TreeKind }
export const trunkRadius = (t: TreeSpot) => species[t.kind].trunk * t.scale
/** Ground height a tree is planted at: the lowest point under most of its root spread, sunk a little further. */
export const treeBase = (t: TreeSpot) => groundUnder(t.x, t.z, species[t.kind].spread * t.scale) - 0.08 * t.scale
/** Walkable gap kept between neighbouring trunks (beyond both radii); young conifers may crowd each other into thickets. */
export const TREE_GAP = 2.6, THICKET_GAP = 1.4
const small = (k: TreeKind) => k === 'conifer' || k === 'birch'
const gapBetween = (a: TreeKind, b: TreeKind) => (small(a) && small(b) ? THICKET_GAP : TREE_GAP)
/** 0 in open glades, 1 in the densest stands; features tens of metres across. */
export function standDensity(x: number, z: number) {
  return smoothstep(0.3, 0.72, valueNoise(x * 0.028 + 3.7, z * 0.028 - 8.1) * 0.8 + valueNoise(x * 0.09 - 2.3, z * 0.09 + 6.1) * 0.2)
}
/** How likely a tree of `kind` is to take root at stand density `d`: big trees fill the stands, young ones the edges. */
function rootChance(kind: TreeKind, d: number, trail: number) {
  if (kind === 'redwood') return 0.01 + 0.99 * d * d * d
  if (kind === 'fir') return 0.02 + 0.98 * d * d
  const edge = 1 - Math.min(1, Math.abs(d - 0.35) * 3), light = 1 - smoothstep(TRAIL_CLEARANCE + 2, TRAIL_CLEARANCE + 9, trail)
  return 0.03 + 0.55 * edge + 0.3 * light
}
export const SPAWN_CLEARING = 9, CABIN_CLEARING = 11, TRAIL_CLEARANCE = 3.4

function pickKind(r: number, mix: [number, number]): TreeKind { return r < mix[0] ? 'redwood' : r < mix[0] + mix[1] ? 'fir' : 'conifer' }
type Area = { minX: number; maxX: number; minZ: number; maxZ: number }
type Ok = (x: number, z: number, radius: number) => boolean
const inside = (a: Area, x: number, z: number) => x > a.minX + 2 && x < a.maxX - 2 && z > a.minZ + 2 && z < a.maxZ - 2
/** Ground, trail, flower/lantern and neighbour checks shared by every placement pass. */
function fits(tree: TreeSpot, area: Area, ok: Ok, others: TreeSpot[]) {
  const { x, z } = tree, radius = trunkRadius(tree)
  if (!inside(area, x, z) || nearestPathPoint(x, z).distance < TRAIL_CLEARANCE + radius || !ok(x, z, radius)) return false
  if ([...flowers, ...lanterns].some(s => Math.hypot(s.x - x, s.z - z) < 3 + radius)) return false
  return others.every(t => Math.hypot(t.x - x, t.z - z) >= trunkRadius(t) + radius + gapBetween(t.kind, tree.kind))
}
const scaleFor = (kind: TreeKind, k: number) => { const [lo, hi] = species[kind].scale; return lo + Math.max(0, Math.min(1, k)) * (hi - lo) }
/** Sentinels: big trunks beside the trails every 14–26 m, alternating sides, framing the walk like the concept art. */
function sentinels(seed: number, area: Area, mix: [number, number], ok: Ok, others: TreeSpot[]) {
  const rand = random(seed), out: TreeSpot[] = []
  for (const path of paths) {
    let side = rand() < 0.5 ? 1 : -1, next = 6 + rand() * 10
    for (let i = 1, walked = 0; i < path.length; i++) {
      const [ax, az] = path[i - 1], [bx, bz] = path[i], length = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / length, uz = (bz - az) / length
      for (; next < walked + length; next += 14 + rand() * 12, side = rand() < 0.7 ? -side : side) {
        const t = next - walked, kind: TreeKind = rand() < mix[0] / (mix[0] + mix[1]) ? 'redwood' : 'fir'
        const tree: TreeSpot = { x: 0, z: 0, scale: scaleFor(kind, 0.55 + rand() * 0.45), kind }
        const offset = TRAIL_CLEARANCE + trunkRadius(tree) + 0.4 + rand() * 2.2
        tree.x = ax + ux * t - uz * side * offset; tree.z = az + uz * t + ux * side * offset
        if (fits(tree, area, ok, [...others, ...out])) out.push(tree)
      }
      walked += length
    }
  }
  return out
}
/** Up to `count` trees in `area`: a fixed budget of seeds weighted by stand density (so glades stay open however many fit
 *  in the stands), with redwood rings around parent trees. */
function plant(seed: number, count: number, area: Area, mix: [number, number], ok: Ok, existing: TreeSpot[] = []) {
  const rand = random(seed), out = sentinels(seed + 1, area, mix, ok, existing)
  const ring: TreeSpot[] = []
  for (let tries = 0; out.length < count && (tries < count * 30 || ring.length); tries++) {
    let tree: TreeSpot
    const child = ring.pop()
    if (child) tree = child
    else {
      const kind = pickKind(rand(), mix), x = area.minX + rand() * (area.maxX - area.minX), z = area.minZ + rand() * (area.maxZ - area.minZ)
      const d = standDensity(x, z)
      if (rand() > rootChance(kind, d, nearestPathPoint(x, z).distance)) continue
      // Trees in the heart of a stand grow taller.
      tree = { x, z, kind, scale: scaleFor(kind, 0.25 * rand() + 0.75 * d * (0.5 + 0.5 * rand())) }
    }
    if (!fits(tree, area, ok, [...existing, ...out])) continue
    out.push(tree)
    // A large redwood seeds a loose ring of younger redwoods and firs around it.
    if (!child && tree.kind === 'redwood' && tree.scale > 0.9 && rand() < 0.7) {
      for (let n = 2 + Math.floor(rand() * 3), a = rand() * 6.28; n > 0; n--, a += 1.2 + rand() * 1.4) {
        const kind: TreeKind = rand() < 0.6 ? 'redwood' : 'fir', young: TreeSpot = { x: 0, z: 0, kind, scale: scaleFor(kind, rand() * 0.5) }
        const distance = trunkRadius(tree) + trunkRadius(young) + TREE_GAP + rand() * 3.5
        young.x = tree.x + Math.cos(a) * distance; young.z = tree.z + Math.sin(a) * distance
        ring.push(young)
      }
    }
  }
  return out.slice(0, count)
}
/** The camp is a dense, tall forest with a clearing at the spawn point and around the cabin. Counts are caps (see plant). */
export const CAMP_TREE_COUNT = 300
const campGround: Ok = (x, z, r) => Math.hypot(x, z) > SPAWN_CLEARING + r && Math.hypot(x - cabin.x, z - cabin.z) > CABIN_CLEARING + r
const campTrees = plant(11, CAMP_TREE_COUNT, CAMP, [0.22, 0.38], campGround)
/** Sparser firs and young conifers on the wetland's dry ground, clear of water. */
export const WETLAND_TREE_COUNT = 40
const wetlandGround: Ok = (x, z, r) => [[0, 0], [r + 1, 0], [-r - 1, 0], [0, r + 1], [0, -r - 1]].every(([dx, dz]) => basinDepth(x + dx, z + dz) === 0)
export const wetlandTrees = plant(61, WETLAND_TREE_COUNT, WETLAND, [0.05, 0.4], wetlandGround)
/** Plateau trees keep a wide ring of open ground around the ancient tree so it stands alone as the landmark. */
export const HIGHLAND_TREE_COUNT = 60
const cradles = cradleSpots.map(([x, z]) => ({ x, z }))
const highlandGround: Ok = (x, z, r) => Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]) > 22 + r && cradles.every(c => Math.hypot(c.x - x, c.z - z) > 4 + r)
const highlandTrees = plant(83, HIGHLAND_TREE_COUNT, HIGHLAND, [0.3, 0.45], highlandGround)
/** VEG-009 birches (scene enrichment): pale trunks and airy crowns where the canopy opens, at stand edges and glade
 *  margins, never deep in a stand; often two or three together. Planted after the conifers, around them. */
export const BIRCH_COUNT = 80
export const birches = (() => {
  const rand = random(91), zones: [Area, Ok][] = [[CAMP, campGround], [CAMP, campGround], [CAMP, campGround], [WETLAND, wetlandGround], [HIGHLAND, highlandGround]]
  const others = [...campTrees, ...wetlandTrees, ...highlandTrees], out: TreeSpot[] = []
  for (let tries = 0; out.length < BIRCH_COUNT && tries < BIRCH_COUNT * 120; tries++) {
    const [area, ok] = zones[Math.floor(rand() * zones.length)], near = out.length && rand() < 0.4 ? out[Math.floor(rand() * out.length)] : null
    const x = near ? near.x + (rand() - 0.5) * 7 : area.minX + rand() * (area.maxX - area.minX), z = near ? near.z + (rand() - 0.5) * 7 : area.minZ + rand() * (area.maxZ - area.minZ)
    const d = standDensity(x, z)
    if (d < 0.08 || d > 0.55) continue
    const tree: TreeSpot = { x, z, kind: 'birch', scale: scaleFor('birch', rand()) }
    if (fits(tree, area, ok, [...others, ...out])) out.push(tree)
  }
  return out
})()
export const forestTrees: TreeSpot[] = [...campTrees, ...wetlandTrees, ...highlandTrees, ...birches]
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
export const treeOccluders: CylinderOccluder[] = forestTrees.map(t => ({ x: t.x, z: t.z, radius: species[t.kind].core * t.scale, height: species[t.kind].height * t.scale * 0.6, base: heightAt(t.x, t.z) }))
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
      out.push({ x, y: treeBase({ x, z, scale, kind }), z, scale, kind })
    }
  }
  return out
})()
