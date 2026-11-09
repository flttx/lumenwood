export interface CylinderOccluder { x: number; z: number; radius: number; height: number }
export interface Vec3Like { x: number; y: number; z: number }
/** Distance along a unit ray to the first vertical cylinder hit, or `maxDistance` when clear. Origins inside a cylinder are ignored. */
export function occludedDistance(origin: Vec3Like, dir: Vec3Like, maxDistance: number, occluders: readonly CylinderOccluder[], padding = 0) {
  let best = maxDistance
  const a = dir.x * dir.x + dir.z * dir.z
  if (a < 1e-8) return best
  for (const o of occluders) {
    const ox = origin.x - o.x, oz = origin.z - o.z, r = o.radius + padding
    const c = ox * ox + oz * oz - r * r
    if (c <= 0) continue
    const b = 2 * (ox * dir.x + oz * dir.z), disc = b * b - 4 * a * c
    if (b >= 0 || disc < 0) continue
    const t = (-b - Math.sqrt(disc)) / (2 * a)
    if (t >= best) continue
    const y = origin.y + dir.y * t
    if (y >= 0 && y <= o.height) best = t
  }
  return best
}
