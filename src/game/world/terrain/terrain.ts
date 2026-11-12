import { BRIDGE, GLADE, WETLAND, regionDistance } from '../regions'
import { cabin } from '../zones/campLayout'
import { smoothstep } from '../../shared/math'
import { WATER_LEVEL, basinDepth, wetlandPath } from '../zones/wetlandLayout'
import { ANCIENT_TREE, elevation, highlandPath } from '../zones/highlandLayout'
import { at } from '../scale'
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
const waterZones = [WETLAND, BRIDGE, GLADE]
/** Where the ground may roll: not in the flat wetlands (the water surface is level) nor on the cabin and ancient-tree pads. */
export function rollWeight(x: number, z: number) {
  return smoothstep(4, 18, regionDistance(x, z, waterZones)) * smoothstep(9, 17, Math.hypot(x - cabin.x, z - cabin.z))
    * smoothstep(15, 24, Math.hypot(x - ANCIENT_TREE[0], z - ANCIENT_TREE[1]))
}
export function rolling(x: number, z: number) {
  return ROLL_HEIGHT * ((valueNoise(x * 0.022 + 7, z * 0.022 - 3) - 0.5) * 0.8 + (valueNoise(x * 0.07 - 11, z * 0.07 + 5) - 0.5) * 0.2) * rollWeight(x, z)
}
/** Ground height: hills outside the regions, rolling swells on land, wetland pools and channel below 0, the highland rise. */
export function heightAt(x: number, z: number) {
  const rim = hillWeight(x, z), basin = basinDepth(x, z)
  return (rim === 0 ? 0 : rim * HILL_HEIGHT * (0.45 + 0.55 * valueNoise(x * 0.06, z * 0.06))) + basin + elevation(z) + rolling(x, z)
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
  ([[0, 0], [3.5, -1.5], [8, -3], [10.5, -7], [13.08, -13.08]] as const).map(at),
  ([[0, 0], [-1.6, 4], [-4.6, 9.5], [-5.6, 14], [-3.6, 17], [-3.4, 21.5], [-3.7, 29], [-3.3, 37]] as const).map(at),
  wetlandPath,
  highlandPath,
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
const MUD: [number, number, number] = [0.2, 0.22, 0.16]
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number]
/** sRGB ground colour: moss patches, worn earth paths, slightly darker hills, dark wet mud around and under water. */
export function groundColor(x: number, z: number) {
  const patches = valueNoise(x * 0.18 + 40, z * 0.18) * 0.7 + valueNoise(x * 0.9, z * 0.9) * 0.3
  let color = mix(DEEP, MOSS, patches)
  color = mix(color, HILL, hillWeight(x, z))
  color = mix(color, EARTH, pathWeight(x, z) * 0.75)
  // Darkens from just above the waterline down, so shores read as wet before the water starts.
  return mix(color, MUD, smoothstep(0.02, WATER_LEVEL - 0.2, basinDepth(x, z)))
}
