import type { BoxCollider, CircleCollider } from '../../player/collision'
import type { ScatterItem } from '../../rendering/scatterChunks'
import { random } from '../../shared/random'
import { CAMP, HIGHLAND, WETLAND } from '../regions'
import { groundUnder, nearestPathPoint, paths, pathWeight } from '../terrain/terrain'
import { cabin, campClearings } from './campLayout'
import { flowers } from './floraLayout'
import { ANCIENT_TREE, TREE_ROOT_RADIUS, highlandPath } from './highlandLayout'
import { basinDepth, brookSegments, channelBanks, CHANNEL, pools, shoreScale, wetlandPath, WATER_LEVEL } from './wetlandLayout'
import { SPAWN_CLEARING, forestTrees, standDensity, trunkRadius } from './forestLayout'
import { lanterns } from '../../features/route/routeLayout'
// Scenery dressing (scene upgrade, 2026-11-12): undergrowth, props and small structures from the second Meshy batch,
// placed deterministically. Everything keeps clear of trails, water (except reeds), route nodes, flowers and trunks.
// Grass is kept off the ground under structures and nodes so they sit cleanly.
export const grassClearings: { x: number; z: number; r: number }[] = [
  { x: cabin.x, z: cabin.z, r: 3.6 },
  ...lanterns.map(l => ({ x: l.x, z: l.z, r: 0.8 })),
  { x: ANCIENT_TREE[0], z: ANCIENT_TREE[1], r: TREE_ROOT_RADIUS + 1 },
  ...campClearings,
]
const spots = [...flowers, ...lanterns]
function clear(x: number, z: number, room: number) {
  if (basinDepth(x, z) < 0 || pathWeight(x, z) > 0.25 || Math.hypot(x - cabin.x, z - cabin.z) < 6 + room) return false
  if (Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]) < TREE_ROOT_RADIUS + 3 + room) return false
  if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 1.4 + room)) return false
  if (campClearings.some(c => Math.hypot(c.x - x, c.z - z) < c.r + room)) return false
  return forestTrees.every(t => Math.hypot(t.x - x, t.z - z) > trunkRadius(t) + 0.4 + room)
}
/** A placed model; `footprint` (metres at scale 1) is its base radius, so it sits on the lowest ground beneath it. */
const item = (x: number, z: number, angle: number, scale: number, lift = 0, footprint = 0.5): ScatterItem => ({ x, y: groundUnder(x, z, footprint * scale) + lift, z, angle, scale })
type Area = { minX: number; maxX: number; minZ: number; maxZ: number }
/** Mostly around tree feet (clumped, as in the concept art), the rest scattered across `area`. */
function undergrowth(seed: number, count: number, areas: Area[], room: number, scale: [number, number], nearTrees = 0.7, footprint = 0.5) {
  const rand = random(seed), out: ScatterItem[] = []
  const inAreas = (x: number, z: number) => areas.some(a => x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ)
  const anchors = forestTrees.filter(t => inAreas(t.x, t.z))
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    let x: number, z: number
    if (anchors.length && rand() < nearTrees) {
      const t = anchors[Math.floor(rand() * anchors.length)], a = rand() * Math.PI * 2, d = trunkRadius(t) + 0.8 + rand() * 3.5
      x = t.x + Math.cos(a) * d; z = t.z + Math.sin(a) * d
    } else {
      const area = areas[Math.floor(rand() * areas.length)]
      x = area.minX + rand() * (area.maxX - area.minX); z = area.minZ + rand() * (area.maxZ - area.minZ)
    }
    if (!inAreas(x, z) || !clear(x, z, room)) continue
    out.push(item(x, z, rand() * Math.PI * 2, scale[0] + rand() * (scale[1] - scale[0]), 0, footprint))
  }
  return out
}
export const ferns = undergrowth(201, 1100, [CAMP, HIGHLAND, WETLAND], 0.2, [0.8, 1.5], 0.7, 0.6)
export const mossStones = undergrowth(203, 260, [CAMP, HIGHLAND, WETLAND], 0.6, [0.6, 1.4], 0.4, 0.75)
export const mushrooms = undergrowth(205, 220, [CAMP, WETLAND, HIGHLAND], 0.1, [0.8, 1.6], 0.9, 0.3)

/** VEG-005 fallen logs (5.4 × 2.6 × 2.5 m at scale 1) lie off the trails; each gets an oriented box collider. */
export const LOG_HALF: [number, number] = [2.5, 0.75]
export const logs = (() => {
  const rand = random(207), out: ScatterItem[] = []
  for (let tries = 0; out.length < 26 && tries < 4000; tries++) {
    const area = [CAMP, CAMP, HIGHLAND][Math.floor(rand() * 3)]
    const x = area.minX + 4 + rand() * (area.maxX - area.minX - 8), z = area.minZ + 4 + rand() * (area.maxZ - area.minZ - 8)
    if (!clear(x, z, 3) || nearestPathPoint(x, z).distance < 5 || Math.hypot(x, z) < SPAWN_CLEARING + 3 || out.some(l => Math.hypot(l.x - x, l.z - z) < 12)) continue
    out.push(item(x, z, rand() * Math.PI * 2, 0.8 + rand() * 0.4, -0.12, 2.6))
  }
  return out
})()
export const logColliders: BoxCollider[] = logs.map(l => ({ x: l.x, z: l.z, halfX: LOG_HALF[0] * l.scale, halfZ: LOG_HALF[1] * l.scale, angle: l.angle }))

/** VEG-008 reeds ring the wetland pools' shores and both banks of the channel. */
export const reeds = (() => {
  const rand = random(209), out: ScatterItem[] = []
  pools.forEach((p, i) => {
    for (let n = 0; n < Math.round(p.r * 2.2); n++) {
      const a = rand() * Math.PI * 2, d = p.r * shoreScale(i, a) * (0.62 + rand() * 0.3)
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d
      if (pathWeight(x, z) < 0.2) out.push(item(x, z, rand() * 6.28, 0.7 + rand() * 0.6, -0.1))
    }
  })
  for (let x = WETLAND.minX; x < WETLAND.maxX; x += 2.2) for (const bank of [0, 1]) {
    if (rand() < 0.35) continue
    const z = channelBanks(x)[bank] + (bank ? 1 : -1) * (0.3 + rand() * 1.2)
    if (pathWeight(x, z) < 0.2 && Math.abs(x - (CHANNEL.minX + CHANNEL.maxX) / 2) < 1e9) out.push(item(x, z, rand() * 6.28, 0.7 + rand() * 0.6, -0.1))
  }
  return out.filter(r => r.y > WATER_LEVEL - 1)
})()

/** PRP-003 stepping-stone runs laid along the wetland trail, a few metres apart, following its direction. */
export const steppingStones = (() => {
  const out: ScatterItem[] = []
  for (let i = 1; i < wetlandPath.length; i++) {
    const [ax, az] = wetlandPath[i - 1], [bx, bz] = wetlandPath[i], length = Math.hypot(bx - ax, bz - az), angle = Math.atan2(-(bz - az), bx - ax)
    for (let s = 3; s < length - 3; s += 7) { const t = s / length; out.push(item(ax + (bx - ax) * t, az + (bz - az) * t, angle, 1.2, 0.02)) }
  }
  return out
})()

/** ARC-003 fence runs: along the cabin trail near the spawn and around the cabin clearing, each 2.6 m segment end to end. */
export const FENCE_LENGTH = 2.6
export const fences = (() => {
  const out: ScatterItem[] = [], trail = paths[0]
  for (let i = 1; i < trail.length - 1; i++) {
    const [ax, az] = trail[i - 1], [bx, bz] = trail[i], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length
    for (let s = FENCE_LENGTH / 2; s < length - FENCE_LENGTH / 2; s += FENCE_LENGTH) {
      if (i === 1 && s < 10) continue // the spawn clearing stays open
      const x = ax + ux * s - uz * 2.1, z = az + uz * s + ux * 2.1 // 2.1 m to the trail's left
      if (clear(x, z, -0.3)) out.push(item(x, z, Math.atan2(-uz, ux), 1, 0, 1.3))
    }
  }
  return out
})()
export const fenceColliders: BoxCollider[] = fences.map(f => ({ x: f.x, z: f.z, halfX: FENCE_LENGTH / 2, halfZ: 0.18, angle: f.angle }))

/** Mushrooms and stones are small enough to walk over; only logs and fences collide. Rocks of PRP-002 are knee-high. */
export const stoneColliders: CircleCollider[] = mossStones.filter(s => s.scale > 1.1).map(s => ({ x: s.x, z: s.z, radius: 0.6 * s.scale }))

/**
 * ARC-002 footbridges over the brooks, aligned with the trail. The v2 model (2026-11-12) is 8.68 × 2.7 × 2.91 m: an arched
 * deck between two railings on stone abutments. Its base sits BRIDGE_BASE below the (flat) wetland bank so the deck ends
 * meet the ground. `deckHeight` follows the measured deck profile where the player stands on one, or -Infinity elsewhere;
 * the railings are box colliders, so the deck is entered only from its ends.
 */
export const BRIDGE_HALF: [number, number] = [4.35, 0.75]
export const BRIDGE_BASE = -0.72
export const footbridges = brookSegments.map(i => {
  const [ax, az] = wetlandPath[i], [bx, bz] = wetlandPath[i + 1]
  return { x: (ax + bx) / 2, z: (az + bz) / 2, angle: Math.atan2(-(bz - az), bx - ax) }
})
/** Deck top above the model's base, `u` metres from mid-span: 1.27 m at the crown, easing to 0.88 m at the abutments, then a ramp to the bank. */
export function deckProfile(u: number) {
  const a = Math.abs(u), crown = (v: number) => 1.27 - 0.27 * (v / 3) ** 2
  return a <= 3.6 ? crown(a) : crown(3.6) + (-BRIDGE_BASE - crown(3.6)) * Math.min(1, (a - 3.6) / (BRIDGE_HALF[0] - 3.6))
}
export function deckHeight(x: number, z: number) {
  for (const b of footbridges) {
    const cos = Math.cos(b.angle), sin = Math.sin(b.angle), dx = x - b.x, dz = z - b.z
    const along = dx * cos - dz * sin, across = dx * sin + dz * cos
    if (Math.abs(along) <= BRIDGE_HALF[0] && Math.abs(across) <= BRIDGE_HALF[1]) return BRIDGE_BASE + deckProfile(along)
  }
  return -Infinity
}
/** The two railings of each footbridge (measured about 1.2 m off the centre line). */
export const bridgeRailColliders: BoxCollider[] = footbridges.flatMap(b => [-1, 1].map(side => ({
  x: b.x + Math.sin(b.angle) * 1.15 * side, z: b.z + Math.cos(b.angle) * 1.15 * side, halfX: 3.9, halfZ: 0.15, angle: b.angle,
})))

// ---- Scene enrichment (2026-11-12): flowering shrubs, wildflowers, stumps and trail signposts ----------------------
/** VEG-010 flowering shrubs (about 1.4 m) round tree feet and glade edges; solid, like the larger stones. */
export const shrubs = undergrowth(211, 170, [CAMP, WETLAND, HIGHLAND], 0.8, [0.75, 1.15], 0.55, 0.7).filter(s => standDensity(s.x, s.z) < 0.75)
export const shrubColliders: CircleCollider[] = shrubs.map(s => ({ x: s.x, z: s.z, radius: 0.6 * s.scale }))
/** VEG-012 mossy stumps (about 0.9 m tall): scattered in the stands, where trees once fell. */
export const stumps = undergrowth(215, 46, [CAMP, HIGHLAND, WETLAND], 1.0, [0.75, 1.15], 0.35, 1.1)
export const STUMP_RADIUS = 0.75 // the stump with its knee-high roots (VEG-012 measures 0.78 m at 0.8 m up)
export const stumpColliders: CircleCollider[] = stumps.map(s => ({ x: s.x, z: s.z, radius: STUMP_RADIUS * s.scale }))
/** VEG-011 wildflower clumps gather in drifts in the glades and along the trail edges, where the sun reaches the ground. */
export const wildflowers = (() => {
  const rand = random(213), out: ScatterItem[] = []
  for (let tries = 0, drifts = 0; drifts < 150 && tries < 20000; tries++) {
    const area = [CAMP, CAMP, CAMP, HIGHLAND, WETLAND][Math.floor(rand() * 5)]
    const cx = area.minX + rand() * (area.maxX - area.minX), cz = area.minZ + rand() * (area.maxZ - area.minZ)
    const trail = nearestPathPoint(cx, cz).distance
    if (standDensity(cx, cz) > 0.35 && (trail < 2.2 || trail > 5)) continue
    drifts++
    for (let n = 6 + Math.floor(rand() * 8); n > 0; n--) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 2.8, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d
      if (clear(x, z, 0.1)) out.push(item(x, z, rand() * Math.PI * 2, 0.7 + rand() * 0.6))
    }
  }
  return out
})()
/** PRP-006 signposts at the trail junctions: the spawn fork, the corridor's far end, the ramp foot. */
export const SIGNPOST_RADIUS = 0.2
export const signposts = (() => {
  const spot = (x: number, z: number, dx: number, dz: number) => {
    const d = Math.hypot(dx, dz), sx = x + (dx / d) * 2.6, sz = z + (dz / d) * 2.6
    return { ...item(sx, sz, Math.atan2(x - sx, z - sz), 1) } // the boards face the junction
  }
  const [a0, a1] = paths[0], [b0, b1] = paths[1], [w0] = wetlandPath, [h0, h1] = highlandPath
  return [
    spot(0, 0, -((a1[0] - a0[0]) / Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) + (b1[0] - b0[0]) / Math.hypot(b1[0] - b0[0], b1[1] - b0[1])),
      -((a1[1] - a0[1]) / Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) + (b1[1] - b0[1]) / Math.hypot(b1[0] - b0[0], b1[1] - b0[1]))),
    spot(w0[0], w0[1], 1, 0),
    spot(h0[0], h0[1], -(h1[1] - h0[1]), h1[0] - h0[0]),
  ].filter(s => clear(s.x, s.z, -1.2))
})()
export const signpostColliders: CircleCollider[] = signposts.map(s => ({ x: s.x, z: s.z, radius: SIGNPOST_RADIUS }))
