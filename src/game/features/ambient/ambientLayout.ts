import { random } from '../../shared/random'
import { CAMP, HIGHLAND, WETLAND } from '../../world/regions'
import { heightAt, nearestPathPoint } from '../../world/terrain/terrain'
import { WATER_LEVEL, pools } from '../../world/zones/wetlandLayout'
import { flowers } from '../../world/zones/floraLayout'
import { standDensity } from '../../world/zones/forestLayout'
// Where the ambient creatures live (code particles, scene enrichment 2026-11-12). Butterflies keep to sunny glades, trail
// edges and the flowers; dragonflies to the wetland pools. Each home is x, ground y, z, plus how far the creature roams.
export interface Home { x: number; y: number; z: number; roam: number }

export function butterflyHomes(count = 110) {
  const rand = random(401), out: Home[] = flowers.filter(f => f.zone !== 'highland' || rand() < 0.5).map(f => ({ x: f.x, y: heightAt(f.x, f.z), z: f.z, roam: 2.5 }))
  for (let tries = 0; out.length < count && tries < count * 60; tries++) {
    const area = [CAMP, CAMP, HIGHLAND, WETLAND][Math.floor(rand() * 4)]
    const x = area.minX + rand() * (area.maxX - area.minX), z = area.minZ + rand() * (area.maxZ - area.minZ)
    // Open, sunny ground: glades and the light along the trails.
    if (standDensity(x, z) > 0.35 && nearestPathPoint(x, z).distance > 7) continue
    if (pools.some(p => Math.hypot(p.x - x, p.z - z) < p.r)) continue
    out.push({ x, y: heightAt(x, z), z, roam: 3 + rand() * 3 })
  }
  return out
}

export function dragonflyHomes() {
  const rand = random(403), out: Home[] = []
  for (const p of pools) for (let n = 0; n < Math.max(1, Math.round(p.r / 4)); n++) {
    const a = rand() * 6.28, d = rand() * p.r * 0.5
    out.push({ x: p.x + Math.cos(a) * d, y: WATER_LEVEL, z: p.z + Math.sin(a) * d, roam: Math.max(1.5, p.r * 0.45) })
  }
  return out
}
