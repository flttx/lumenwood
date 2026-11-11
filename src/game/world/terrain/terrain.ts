import { regionDistance } from '../regions'
import { smoothstep } from '../../shared/math'
// Code-built ground (terrain is allowed as code per AGENTS.md). Every region (camp, corridor, wetlands) stays exactly flat
// at y = 0 so movement, collision and camera logic need no height queries; hills rise with the distance from the walkable
// area, which also turns the corridor into a valley between ridges.
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
/** Ground height; 0 everywhere a player can stand. */
export function heightAt(x: number, z: number) {
  const rim = hillWeight(x, z)
  return rim === 0 ? 0 : rim * HILL_HEIGHT * (0.45 + 0.55 * valueNoise(x * 0.06, z * 0.06))
}

// Footpaths drawn into the ground colour: spawn → cabin door, and a trail north through the corridor into the wetlands.
// Routed so every trunk is at least 1.3 m from a centreline.
export const paths: [number, number][][] = [
  [[0, 0], [3.5, -1.5], [8, -3], [10.5, -7], [11.3, -11.3]],
  [[0, 0], [-1.6, 4], [-4.6, 9.5], [-5.6, 14], [-3.6, 17], [-3.4, 21.5], [-3.7, 29], [-3.3, 38]],
]
function segmentDistance(px: number, pz: number, [ax, az]: [number, number], [bx, bz]: [number, number]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(px - ax - dx * t, pz - az - dz * t)
}
/** 1 on a path centreline, fading to 0 over its soft edge; edges wobble so the trail looks worn rather than drawn. */
export function pathWeight(x: number, z: number) {
  let d = Infinity
  for (const path of paths) for (let i = 1; i < path.length; i++) d = Math.min(d, segmentDistance(x, z, path[i - 1], path[i]))
  const halfWidth = 0.75 + 0.35 * valueNoise(x * 0.7, z * 0.7)
  return 1 - smoothstep(halfWidth * 0.6, halfWidth * 1.4, d)
}

const MOSS: [number, number, number] = [0.42, 0.52, 0.29], DEEP: [number, number, number] = [0.27, 0.37, 0.22]
const EARTH: [number, number, number] = [0.4, 0.33, 0.25], HILL: [number, number, number] = [0.33, 0.42, 0.27]
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number]
/** sRGB ground colour: moss patches, worn earth paths, slightly darker hills. */
export function groundColor(x: number, z: number) {
  const patches = valueNoise(x * 0.18 + 40, z * 0.18) * 0.7 + valueNoise(x * 0.9, z * 0.9) * 0.3
  let color = mix(DEEP, MOSS, patches)
  color = mix(color, HILL, hillWeight(x, z))
  return mix(color, EARTH, pathWeight(x, z) * 0.75)
}
