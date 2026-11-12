import { random } from '../../shared/random'
// Bird flocks (CRT-002, scene enrichment 2026-11-12): every so often a small flock crosses the sky near the player, in a
// loose formation that rises and dips over the canopy. Pure functions of time; the wing beat runs in the vertex shader.
export const FLOCKS = 3, FLOCK_SIZE = 7, PERIOD = 26, CROSSING = 15, SPAN = 120
export interface Crossing { start: number; cx: number; cz: number; angle: number; height: number; side: number; seed: number }

/** The crossing flock `f` is on at `time`, aimed past `center` (the player when that crossing began). */
export function crossingFor(f: number, time: number, center: { x: number; z: number }): Crossing {
  const offset = (f * PERIOD) / FLOCKS, cycle = Math.floor((time + offset) / PERIOD), rand = random(7919 * cycle + 31 * f + 1)
  return { start: cycle * PERIOD - offset, cx: center.x, cz: center.z, angle: rand() * Math.PI * 2, height: 14 + rand() * 8, side: (rand() - 0.5) * 30, seed: cycle * 13 + f }
}

/** Where bird `i` of a crossing is at `time` (null before it starts or after it has gone), and the way it faces. */
export function birdPosition(c: Crossing, i: number, time: number) {
  const u = (time - c.start) / CROSSING
  if (u < 0 || u > 1) return null
  const rand = random(c.seed * 101 + i), dx = Math.sin(c.angle), dz = Math.cos(c.angle)
  // Loose V: each bird trails the leader and sits out to one side, with a little personal drift.
  const back = i * 1.6 + rand() * 1.2, out = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 1.4 + (rand() - 0.5)
  const along = (u - 0.5) * SPAN - back, side = c.side + out + Math.sin(time * 0.9 + i) * 0.4
  return {
    x: c.cx + dx * along + dz * side, z: c.cz + dz * along - dx * side,
    y: c.height + Math.sin(u * Math.PI * 2 + c.seed) * 2.5 + Math.sin(time * 1.3 + i * 2.1) * 0.35 + rand() * 1.5,
    heading: c.angle,
  }
}
