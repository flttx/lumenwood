import { BEACH, BRIDGE, GLADE, GLEN, LAKE, OVERLOOK, REEF, STAR_CLIFF, WETLAND, rectDistance, regionDistance } from '../regions'
import { cabin } from '../zones/campLayout'
import { smoothstep } from '../../shared/math'
import { WATER_LEVEL, basinDepth, wetlandPath } from '../zones/wetlandLayout'
import { ANCIENT_TREE, elevation, highlandPath } from '../zones/highlandLayout'
import { at } from '../scale'
import { WATERFALL } from '../zones/sideLayout'
import { sunlightGround } from '../../features/sunlight/terrain'
import { sunRavineDepth } from '../../features/sunlight/landform'
// Code-built ground (terrain is allowed as code per AGENTS.md). The camp and corridor stay exactly flat at y = 0; in the
// wetlands the ground sinks into pools (the player wades, their height follows the ground) and a deep channel; north of
// the glade the whole land rises up a ramp to the highland plateau. Hills rise
// with the distance from the walkable area, which also turns the corridor into a valley between ridges.
/** Hills start this far outside the walkable area and reach full height at HILL_FULL metres. */
export const FLAT_EDGE = 1.5, HILL_FULL = 14, HILL_HEIGHT = 7

function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return s - Math.floor(s)
}
/** Smooth value noise in [0, 1]. */
export function valueNoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz)
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}

/** 0 on and near the walkable area, rising to 1 where the hills reach full height. */
export function hillWeight(x: number, z: number) { return smoothstep(FLAT_EDGE, HILL_FULL, regionDistance(x, z)) }
/** Rolling ground (scene upgrade): two octaves of gentle swells, about ±1.4 m over tens of metres. */
export const ROLL_HEIGHT = 2.8
const waterZones = [WETLAND, BRIDGE, GLADE, GLEN, LAKE, BEACH]
/** Where the ground may roll: not in the flat wetlands (the water surface is level) nor on the cabin and ancient-tree pads. */
export function rollWeight(x: number, z: number) {
  return smoothstep(4, 18, regionDistance(x, z, waterZones)) * smoothstep(9, 17, Math.hypot(x - cabin.x, z - cabin.z))
    * smoothstep(15, 24, Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]))
}
export function rolling(x: number, z: number) {
  return ROLL_HEIGHT * ((valueNoise(x * 0.022 + 7, z * 0.022 - 3) - 0.5) * 0.8 + (valueNoise(x * 0.07 - 11, z * 0.07 + 5) - 0.5) * 0.2) * rollWeight(x, z)
}
// Side-area landforms (2026-11-12). The glen ends in a cliff the waterfall drops from; beyond the overlook the plateau ends
// in a sea cliff (third pass: the forest is an island in the sea).
export const CLIFF_HEIGHT = 17, CLIFF_FOOT = GLEN.minX - 0.5, CLIFF_TOP = GLEN.minX - 3
/** 0–1: the glen's west cliff (full height west of CLIFF_TOP), across the glen's width. */
export function cliffWeight(x: number, z: number) {
  // Retreat folds outside the playable bank; keep the waterfall's own lip and landing unchanged.
  const awayFromFall = smoothstep(WATERFALL.width / 2 + 1, WATERFALL.width / 2 + 5, Math.abs(z - WATERFALL.z))
  const fold = (1.2 + valueNoise(z * 0.17, 17) * 4.8) * awayFromFall
  const t = smoothstep(CLIFF_FOOT - fold * 0.2, CLIFF_TOP - fold, x)
  // Broad, uneven shelves live entirely beyond the playable bank. The waterfall's own support stays unchanged.
  const shelves = 0.42 * smoothstep(0, 0.4, t) + 0.32 * smoothstep(0.3, 0.76, t) + 0.26 * smoothstep(0.66, 1, t)
  const profile = t + (shelves - t) * awayFromFall * 0.8
  return profile * (1 - smoothstep(GLEN.maxZ - 6, GLEN.maxZ + 14, z)) * (1 - smoothstep(GLEN.minZ + 6, GLEN.minZ - 14, z))
}
// The island (third pass, 2026-11-12; the user: "beyond the forest is the sea; the forest is an island"). Past the hills the
// land falls to a seabed; the coastline wanders with noise between about 45 and 75 m from the walkable areas, so beaches,
// headlands and coves form on their own. East of the overlook and north of the starlight terrace the plateau drops straight into the sea.
export const SEA_LEVEL = -3.5, SEABED = -16
export const SEA_CLIFF_EDGE = OVERLOOK.maxX + 2
export const NORTH_CLIFF_EDGE = STAR_CLIFF.maxZ + 2
/** 0–1: the sea cliff below the overlook (full drop SEA_CLIFF_EDGE + 9 m out), fading out along the coast either side. */
export function seaCliffWeight(x: number, z: number) {
  return smoothstep(SEA_CLIFF_EDGE, SEA_CLIFF_EDGE + 9, x) * (1 - smoothstep(OVERLOOK.maxZ + 25, OVERLOOK.maxZ + 60, z)) * (1 - smoothstep(OVERLOOK.minZ - 25, OVERLOOK.minZ - 60, z))
}
/** 0–1: the northern sea cliff dropping sheer beyond Starlight Terrace. */
export function northSeaCliffWeight(x: number, z: number) {
  return smoothstep(NORTH_CLIFF_EDGE, NORTH_CLIFF_EDGE + 10, z)
    * (1 - smoothstep(STAR_CLIFF.maxX + 18, STAR_CLIFF.maxX + 48, x))
    * (1 - smoothstep(STAR_CLIFF.minX - 18, STAR_CLIFF.minX - 48, x))
}
/** 0–1: how far the land has fallen toward the seabed (0 on the island, 1 out at sea). */
export function seaWeight(x: number, z: number, distance = regionDistance(x, z)) {
  const from = 34 + 26 * valueNoise(x * 0.013 + 5, z * 0.013 - 2)
  return Math.max(smoothstep(from, from + 48, distance), seaCliffWeight(x, z), northSeaCliffWeight(x, z))
}
// The crescent cove (2026-11-13): south of the camp the land runs down as a sandy beach to the waterline at the cove's
// south edge (about 0.15 m above the sea), then shelves to the seabed (with a shallow sandspit out to Tidewater Reef).
const COVE_TOP = BEACH.maxZ - 6, WATERLINE = BEACH.minZ
/** 0–1: inside the cove's beach (fading out into the hills on either side and into the camp to the north). */
export function coveWeight(x: number, z: number) {
  return (1 - smoothstep(BEACH.maxX + 4, BEACH.maxX + 26, Math.abs(x))) * smoothstep(COVE_TOP + 4, COVE_TOP - 6, z)
}
/** Gently meandering waterline, kept just seaward of the walkable beach boundary. */
export function coveShore(x: number) {
  return WATERLINE - 0.3 - 2.8 * valueNoise(x * 0.045 + 3.4, 1.7) - 0.6 * (1 + Math.sin(x * 0.14 + 0.8))
}
/** 0–1: coastal rock terrace south of the sandspit. */
export function reefWeight(x: number, z: number) {
  return 1 - smoothstep(0, 14, rectDistance(x, z, REEF))
}
/** A sloping cove with low wind-shaped dunes, tapering smoothly into a shallow submerged shelf and Tidewater Reef. */
export function beachProfile(x: number, z: number) {
  const shore = coveShore(x)
  const inland = smoothstep(shore + 1.5, shore + 9, z) * (1 - smoothstep(COVE_TOP - 4, COVE_TOP + 3, z))
  const dunes = ((valueNoise(x * 0.065 + 2, z * 0.075 - 3) - 0.5) * 0.9
    + (valueNoise(x * 0.16 - 5, z * 0.12 + 1) - 0.5) * 0.28) * inland
  const t = Math.min(1, Math.max(0, (COVE_TOP - z) / (COVE_TOP - WATERLINE)))
  // Ease the slope to horizontal at the waterline to avoid a sharp normal crease.
  const slope = (SEA_LEVEL + 0.15) * (t + t * t - t * t * t)
  // At the walkable edge all terrain remains dry. Beyond it the shelf meets sea level, with a dry spit out to the reef.
  if (z >= WATERLINE) return slope + dunes
  const edge = SEA_LEVEL + 0.15
  const base = z >= shore
    ? edge + (SEA_LEVEL - edge) * smoothstep(WATERLINE, shore, z)
    : SEA_LEVEL + (SEABED - SEA_LEVEL) * smoothstep(shore, shore - 45, z)
  const rw = reefWeight(x, z)
  const spitW = (1 - smoothstep(8.0, 14.5, Math.abs(x))) * smoothstep(WATERLINE, WATERLINE - 2.5, z) * (1 - smoothstep(-107, -111, z))
  if (rw <= 0 && spitW <= 0) return base
  const spitH = SEA_LEVEL + 0.42 + 1.63 * smoothstep(-101, -108, z)
  const dome = 1 - smoothstep(0, 20, Math.hypot(x, z + 118))
  const reefH = SEA_LEVEL + 2.05 + 0.25 * dome + 0.2 * (valueNoise(x * 0.14 + 5, z * 0.14 - 3) - 0.5)
  const w = 1 - (1 - spitW) * (1 - rw)
  const target = (spitH * spitW + reefH * rw) / Math.max(spitW + rw, 1e-5)
  return base + (target - base) * w
}
/** Ground height: hills outside the regions, rolling swells on land, pools and channel below 0, the highland rise, the
 *  glen's cliff, the cove's beach, and the island's shores falling to the seabed. */
export function heightAt(x: number, z: number) {
  const distance = regionDistance(x, z), rim = smoothstep(FLAT_EDGE, HILL_FULL, distance), basin = basinDepth(x, z)
  let hills = 0
  if (rim > 0) {
    // Multi-octave FBM + subtle ridge shaping replaces single-frequency smooth mounds while staying strictly <= HILL_HEIGHT.
    const n1 = valueNoise(x * 0.045, z * 0.045)
    const n2 = valueNoise(x * 0.11 + 19.3, z * 0.11 - 7.1)
    const ridge = 1 - Math.abs(valueNoise(x * 0.075 - 11.4, z * 0.075 + 23.7) * 2 - 1)
    const shape = Math.min(1, 0.28 + 0.42 * n1 + 0.16 * n2 + 0.14 * ridge * ridge)
    hills = rim * HILL_HEIGHT * shape
  }
  const starLift = 2.6 * smoothstep(340, 356, z) * (1 - smoothstep(26, 48, Math.abs(x + 10)))
  let land = hills + basin + elevation(z) + starLift + rolling(x, z) + CLIFF_HEIGHT * cliffWeight(x, z) * (0.85 + 0.15 * valueNoise(z * 0.3, 2))
  const cove = z < COVE_TOP + 4 ? coveWeight(x, z) : 0
  if (cove > 0) land += (beachProfile(x, z) - land) * cove
  if (cove > 0.99) return land
  if (distance < 30 && x < SEA_CLIFF_EDGE && z < NORTH_CLIFF_EDGE) return sunlightGround(x, z, land) // interior, including the daytime sample
  const sea = seaWeight(x, z, distance)
  return land + (SEABED - land) * sea * sea * (3 - 2 * sea)
}

/**
 * Lowest ground under a footprint of `radius` metres around (x, z): the centre and two rings of twelve samples. Objects
 * with a wide base (root flares, logs, stumps, rocks) sit at this height so no side floats over a slope; the uphill
 * side simply sinks into the ground.
 */
export function groundUnder(x: number, z: number, radius: number) {
  let low = heightAt(x, z)
  if (radius <= 0) return low
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
    low = Math.min(low, heightAt(x + c * radius, z + s * radius), heightAt(x + c * radius * 0.5, z + s * radius * 0.5))
  }
  return low
}

// Footpaths drawn into the ground colour: spawn → cabin door, and a trail north through the corridor into the wetlands.
// Routed so every trunk is at least 1.3 m from a centreline.
export const paths: [number, number][][] = [
  // The cabin trail passes south of the daytime ravine; it never draws a walkable-looking path into the gap.
  [[0, 0], [6, -5], [10, -16], [18, -18], [26.25, -17.5], [32.7, -32.7]],
  ([[0, 0], [-1.6, 4], [-4.6, 9.5], [-5.6, 14], [-3.6, 17], [-3.4, 21.5], [-3.7, 29], [-3.3, 37]] as const).map(at),
  wetlandPath,
  highlandPath,
  // Side trails (2026-11-12): west to the waterfall glen, east from the cabin path to the mushroom hollow, west from the
  // wetland trail to the mirror lake, east across the plateau to the overlook.
  [[0, 0], [-14, 3], [-30, 6], [-45, 5], [-56, 5.5], [-72, 6], [-86, 8], [-98, 9], [-107, 10]],
  [[26.25, -17.5], [38, -22], [50, -27], [62, -27.5], [75, -28], [88, -30], [97, -34]],
  [[-15, 105], [-40, 111], [-55, 113], [-66, 121], [-78, 122]],
  [[-12.5, 260], [10, 268], [30, 285], [46, 299.5], [62, 299.5], [76, 299], [86, 298]],
  // South from the spawn down to the cove's beach (2026-11-13).
  [[0, 0], [3, -14], [1, -30], [-2, -46], [0, -62], [1, -76]],
  [[10, -16], [13, -17], [22.5, -17], [22.5, -14]],
  // Interconnected side loops & expansion trails (2026-11-24).
  [[-97, 30], [-97, 50], [-96.5, 72], [-97, 93]],
  [[19, 98], [32, 100], [48, 100], [60, 108], [67, 118]],
  [[97, -34], [98, -12], [98, 20], [98, 55], [98, 86], [90, 98], [78, 114]],
  [[73, 138], [76, 152], [77, 180], [77, 215], [77, 250], [77, 278], [77, 296]],
  [[-10, 308], [-10, 328], [-10, 344], [-10, 358]],
  // Southern coastal woodland trails connecting Glen ↔ Beach ↔ Hollow (2026-11-25).
  [[-92, -32], [-90, -52], [-72, -60], [-42, -66], [-18, -70]],
  [[96, -42], [92, -60], [68, -62], [42, -66], [18, -70]],
]
function segmentPoint(px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]): [number, number] {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)))
  return [ax + dx * t, az + dz * t]
}
function segmentDistance(px: number, pz: number, a: [number, number], b: [number, number]) {
  const [x, z] = segmentPoint(px, pz, a, b)
  return Math.hypot(px - x, pz - z)
}
/** Closest point on any trail centreline, and its distance. */
export function nearestPathPoint(x: number, z: number) {
  let best: [number, number] = [x, z], distance = Infinity
  for (const path of paths) for (let i = 1; i < path.length; i++) {
    const p = segmentPoint(x, z, path[i - 1], path[i]), d = Math.hypot(x - p[0], z - p[1])
    if (d < distance) { distance = d; best = p }
  }
  return { point: best, distance }
}
/** 1 on a path centreline, fading to 0 over its soft edge; edges wobble so the trail looks worn rather than drawn. */
export function pathWeight(x: number, z: number) {
  let d = Infinity
  for (const path of paths) for (let i = 1; i < path.length; i++) d = Math.min(d, segmentDistance(x, z, path[i - 1], path[i]))
  const halfWidth = 1.05 + 0.4 * valueNoise(x * 0.5, z * 0.5)
  return 1 - smoothstep(halfWidth * 0.6, halfWidth * 1.4, d)
}

const MOSS: [number, number, number] = [0.42, 0.52, 0.29], DEEP: [number, number, number] = [0.27, 0.37, 0.22]
const EARTH: [number, number, number] = [0.4, 0.33, 0.25], HILL: [number, number, number] = [0.33, 0.42, 0.27]
const MUD: [number, number, number] = [0.2, 0.22, 0.16], ROCK: [number, number, number] = [0.58, 0.55, 0.5], ROCK_DARK: [number, number, number] = [0.36, 0.35, 0.33]
const WET_ROCK: [number, number, number] = [0.2, 0.21, 0.21], SLIME: [number, number, number] = [0.18, 0.27, 0.17]
const SAND: [number, number, number] = [0.78, 0.7, 0.52], WET_SAND: [number, number, number] = [0.66, 0.59, 0.43], SEAFLOOR: [number, number, number] = [0.36, 0.42, 0.36]
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number]
/** sRGB ground colour: moss patches, worn earth paths, slightly darker hills, dark wet mud around and under water, and on
 *  the coast sand beaches, wet sand at the waterline, a pale seafloor and rock on the sea cliff. */
export function groundColor(x: number, z: number, height = heightAt(x, z)) {
  const patches = valueNoise(x * 0.18 + 40, z * 0.18) * 0.7 + valueNoise(x * 0.9, z * 0.9) * 0.3
  let color = mix(DEEP, MOSS, patches)
  color = mix(color, HILL, hillWeight(x, z))
  // Bare rock on the cliff face, mossy toward its top and foot.
  const cliff = cliffWeight(x, z)
  // Strata: pale and dark bands following the height, broken up by noise.
  const strata = mix(ROCK, ROCK_DARK, smoothstep(0.35, 0.65, valueNoise(height * 1.3 + z * 0.08, x * 0.2)))
  color = mix(color, strata, smoothstep(0.08, 0.3, cliff) * (1 - smoothstep(0.85, 1, cliff)) * (0.75 + 0.25 * valueNoise(x * 0.7, z * 0.4)))
  // Behind and beside the waterfall the rock is soaked dark, with green slime streaks.
  const wet = cliff * (1 - smoothstep(WATERFALL.width / 2, WATERFALL.width / 2 + 3, Math.abs(z - WATERFALL.z)))
  color = mix(color, mix(WET_ROCK, SLIME, smoothstep(0.4, 0.7, valueNoise(z * 1.7, height * 0.5))), wet * 0.85)
  color = mix(color, EARTH, pathWeight(x, z) * 0.75)
  // Exposed soil and stone in the daytime hollow; no green carpet painted down its steep sides.
  const ravine = sunRavineDepth(x, z)
  if (ravine > 0) color = mix(color, mix([0.32, 0.30, 0.25], [0.43, 0.41, 0.34], patches), smoothstep(0.12, 1.0, ravine))
  // Darkens from just above the waterline down, so shores read as wet before the water starts.
  color = mix(color, MUD, smoothstep(0.02, WATER_LEVEL - 0.2, basinDepth(x, z)))
  if (height > SEA_LEVEL + 3.5) return color
  const seaCliff = Math.max(seaCliffWeight(x, z), northSeaCliffWeight(x, z)), beach = 1 - smoothstep(SEA_LEVEL + 1.2, SEA_LEVEL + 3.5, height)
  const reefRock = z < -102 ? smoothstep(SEA_LEVEL + 0.6, SEA_LEVEL + 1.8, height) * (1 - smoothstep(20, 32, Math.abs(x))) : 0
  const rockFace = Math.max(seaCliff, reefRock)
  if (reefRock > 0) color = mix(color, strata, reefRock * 0.85)
  color = mix(color, mix(SAND, strata, rockFace), beach * (0.8 + 0.2 * valueNoise(x * 0.4, z * 0.4)))
  color = mix(color, WET_SAND, smoothstep(SEA_LEVEL + 0.6, SEA_LEVEL - 0.2, height) * (1 - rockFace))
  return mix(color, SEAFLOOR, smoothstep(SEA_LEVEL - 0.5, SEA_LEVEL - 4, height))
}
