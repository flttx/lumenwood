import { SUN_BLOCKER, SUN_CLEARING, SUN_MAX_RAY, SUN_MIRRORS, SUN_PLANT, sunlightDeckHeight } from './layout'
import { sunRavineGap } from './landform'

export interface SunlightProgress { steps: [number, number]; growth: number; grownAt: number | null; crossed: boolean }
export interface SunlightSave { steps: [number, number]; grown: boolean; crossed: boolean }
export interface LightPoint { x: number; z: number }
export interface LightSegment { from: LightPoint; to: LightPoint; hit: 'mirror' | 'plant' | 'rock' | 'air' }
export interface LightPath { segments: LightSegment[]; relay: boolean; receiver: boolean; loop: boolean }
export const createSunlight = (): SunlightProgress => ({ steps: [0, 4], growth: 0, grownAt: null, crossed: false })
export const hasDaylight = (time: number) => time < 0.65
export function rotateSunMirror(p: SunlightProgress, index: number, turn: number) {
  if (index !== 0 && index !== 1) return false
  p.steps[index] = (p.steps[index] + turn % 8 + 8) % 8
  return true
}
export function mirrorDirection(step: number) { const a = step * Math.PI / 4; return { x: Math.sin(a), z: Math.cos(a) } }
const rayCircle = (start: LightPoint, d: LightPoint, target: LightPoint, radius: number) => {
  const dx = target.x - start.x, dz = target.z - start.z, along = dx * d.x + dz * d.z, miss = dx * dx + dz * dz - along * along
  return along > 0 && miss <= radius * radius ? Math.max(0, along - Math.sqrt(Math.max(0, radius * radius - miss))) : Infinity
}
/** Trace from the sun-fed first mirror, through finite receiver discs and the sample's rock. Wrong headings show where
 * light goes; the visited set prevents infinite A→B→A loops. The reserved clearing contains no unrelated blockers. */
export function traceSunlight(steps: readonly number[], daylight: boolean): LightPath {
  const out: LightPath = { segments: [], relay: false, receiver: false, loop: false }
  if (!daylight) return out
  const visited = new Set<number>()
  let index = 0
  for (let bounce = 0; bounce < 4; bounce++) {
    visited.add(index)
    const start = SUN_MIRRORS[index], d = mirrorDirection(steps[index])
    const targets = [
      ...SUN_MIRRORS.flatMap((m, i) => i === index ? [] : [{ point: m, radius: 0.7, kind: 'mirror' as const, index: i }]),
      { point: SUN_PLANT, radius: 0.85, kind: 'plant' as const, index: -1 },
      { point: SUN_BLOCKER, radius: SUN_BLOCKER.radius, kind: 'rock' as const, index: -1 },
    ].map(t => ({ ...t, distance: rayCircle(start, d, t.point, t.radius) })).sort((a, b) => a.distance - b.distance)
    const hit = targets[0]
    let limit = SUN_MAX_RAY
    if (d.x > 1e-6) limit = Math.min(limit, (SUN_CLEARING.maxX - start.x) / d.x)
    if (d.x < -1e-6) limit = Math.min(limit, (SUN_CLEARING.minX - start.x) / d.x)
    if (d.z > 1e-6) limit = Math.min(limit, (SUN_CLEARING.maxZ - start.z) / d.z)
    if (d.z < -1e-6) limit = Math.min(limit, (SUN_CLEARING.minZ - start.z) / d.z)
    const reached = hit.distance < limit, length = reached ? hit.distance : limit
    // Receivers accept a finite disc, but the visible ray must connect to its optical centre (no floating gap).
    const to = reached && hit.kind !== 'rock' ? hit.point : { x: start.x + d.x * length, z: start.z + d.z * length }
    out.segments.push({ from: start, to, hit: reached ? hit.kind : 'air' })
    if (!reached || hit.kind === 'rock') break
    if (hit.kind === 'plant') { out.receiver = true; break }
    out.relay = true
    if (visited.has(hit.index)) { out.loop = true; break }
    index = hit.index
  }
  return out
}
/** Three seconds of received light grows a permanent crossing; later rotation or night never removes a bridge. */
export function advanceSunlight(p: SunlightProgress, dt: number, daylight: boolean, now: number) {
  const path = traceSunlight(p.steps, daylight)
  if (p.grownAt !== null) return path
  p.growth = Math.max(0, Math.min(1, p.growth + Math.min(dt, 0.1) * (path.receiver ? 1 / 3 : -0.35)))
  if (p.growth >= 1 - 1e-6) { p.growth = 1; p.grownAt = now }
  return path
}
export function parseSunlight(raw: unknown): SunlightSave {
  const fallback: SunlightSave = { steps: [0, 4], grown: false, crossed: false }
  if (typeof raw !== 'object' || raw === null) return fallback
  const d = raw as Partial<SunlightSave>
  if (!Array.isArray(d.steps) || d.steps.length !== 2 || !d.steps.every(s => Number.isInteger(s) && s >= 0 && s < 8)) return fallback
  return { steps: [d.steps[0], d.steps[1]], grown: d.grown === true, crossed: d.grown === true && d.crossed === true }
}
export function restoreSunlight(data: SunlightSave, past: number): SunlightProgress {
  return { steps: [...data.steps], growth: data.grown ? 1 : 0, grownAt: data.grown ? past : null, crossed: data.crossed }
}
export function safeSunlightSpawn(position: [number, number], grown: boolean): [number, number] {
  // Old rectangular-bank saves can now stand on a slope. Preserve bridge positions and otherwise resume on safe land.
  const [x, z] = position
  return sunRavineGap(x, z) > -0.35 && !Number.isFinite(sunlightDeckHeight(x, z, grown)) ? [14, -16] : position
}
