import { glowFlowers } from '../../world/zones/campLayout'
import { WORLD_LIMIT } from '../../player/movement'
/** Deterministic PRNG (mulberry32) so the swarm looks the same every visit. */
export function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const FIREFLY_COUNT = 160
/** Home positions: most hover around the glowing flowers, the rest drift over the whole camp. Flat xyz array. */
export function fireflyHomes(count = FIREFLY_COUNT, seed = 7) {
  const rand = random(seed), out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    let x: number, z: number, y: number
    if (i % 5 < 3) {
      const flower = glowFlowers[i % glowFlowers.length], angle = rand() * Math.PI * 2, r = 0.4 + rand() * 2.6
      x = flower.x + Math.cos(angle) * r; z = flower.z + Math.sin(angle) * r; y = 0.3 + rand() * 1.7
    } else {
      x = (rand() * 2 - 1) * (WORLD_LIMIT - 2); z = (rand() * 2 - 1) * (WORLD_LIMIT - 2); y = 0.6 + rand() * 3
    }
    out.set([x, y, z], i * 3)
  }
  return out
}
