import { lanterns, ZONES } from './routeLayout'
import type { RouteProgress } from './progress'
import { flowers } from '../../world/zones/floraLayout'
import { GLADE_CENTRE } from '../../world/zones/wetlandLayout'
// "The forest wakes" (third visual pass, 2026-11-12; Gris / Ōkami-style colour restoration). The world starts a little
// faded; colour returns in circles that grow from each woken flower and each lit lantern, a completed zone floods its
// whole area, the glade finale fills the glade, and the ending restores everything. Pure: rendering/AtmospherePass
// draws the circles (with a warm wavefront while they grow).
export const REVIVE = {
  flowerRadius: 9, flowerGrow: 1.6,
  lanternRadius: 42, lanternGrow: 4,
  zoneRadius: 170, zoneGrow: 7,
  gladeRadius: 34,
  endingGrow: 8,
} as const
/** Enough for every flower and lantern plus the glade. */
export const MAX_REVIVE = flowers.length + lanterns.length + 1
const ease = (t: number) => { const k = Math.max(0, Math.min(1, t)); return 1 - (1 - k) ** 3 }
/** 1 while a circle is still growing (fading out as it reaches full size), 0 once grown: the wavefront's strength. */
const wave = (t: number) => (t >= 0 && t < 1 ? 1 - t : 0)

/**
 * Writes circles (x, z, radius, wavefront) into `out` (4 floats each) and returns how many were written, plus `all`:
 * how fully the ending has restored the whole world (0–1).
 */
export function reviveCircles(p: RouteProgress, now: number, out: Float32Array) {
  let n = 0
  const push = (x: number, z: number, r: number, w: number) => { if (r > 0.01 && n < MAX_REVIVE) { out.set([x, z, r, w], n * 4); n++ } }
  for (const [i, at] of p.releasedAt) {
    const f = flowers[i], t = (now - at) / REVIVE.flowerGrow
    if (f) push(f.x, f.z, REVIVE.flowerRadius * ease(t), wave(t) * 0.6)
  }
  lanterns.forEach((l, i) => {
    const lit = p.litAt[i]
    if (lit === null) return
    const t = (now - lit) / REVIVE.lanternGrow, done = p.completedAt[l.zone]
    const z = done === null ? 0 : (now - done) / REVIVE.zoneGrow
    push(l.x, l.z, REVIVE.lanternRadius * ease(t) + (REVIVE.zoneRadius - REVIVE.lanternRadius) * ease(z), Math.max(wave(t), wave(z)))
  })
  if (p.finaleAt !== null) { const t = (now - p.finaleAt) / REVIVE.lanternGrow; push(GLADE_CENTRE[0], GLADE_CENTRE[1], REVIVE.gladeRadius * ease(t), wave(t)) }
  const end = p.completedAt[ZONES[ZONES.length - 1]]
  return { count: n, all: end === null ? 0 : ease((now - end) / REVIVE.endingGrow) }
}
