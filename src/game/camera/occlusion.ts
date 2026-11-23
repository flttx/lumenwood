/** Vertical cylinder from `base` (default 0) up to `base + height`. */
export interface CylinderOccluder { x: number; z: number; radius: number; height: number; base?: number }
export interface Vec3Like { x: number; y: number; z: number }
/** Distance along a unit ray to the first vertical cylinder hit, or `maxDistance` when clear. Origins inside a cylinder are ignored. */
export function occludedDistance(origin: Vec3Like, dir: Vec3Like, maxDistance: number, occluders: readonly CylinderOccluder[], padding = 0) {
  let best = maxDistance
  const a = dir.x * dir.x + dir.z * dir.z
  for (const o of occluders) {
    const ox = origin.x - o.x, oz = origin.z - o.z, r = o.radius + padding
    const c = ox * ox + oz * oz - r * r
    const base = o.base ?? 0
    if (c <= 0 && origin.y >= base && origin.y <= base + o.height) continue
    let near = -Infinity, far = Infinity
    if (a < 1e-8) { if (c > 0) continue }
    else {
      const b = 2 * (ox * dir.x + oz * dir.z), disc = b * b - 4 * a * c
      if (disc < 0) continue
      const root = Math.sqrt(disc)
      near = (-b - root) / (2 * a); far = (-b + root) / (2 * a)
    }
    // Canopy volumes have a raised base. A camera can enter through their bottom cap even when the pivot is below
    // and horizontally inside them; checking only the near cylindrical side missed this case.
    if (Math.abs(dir.y) < 1e-8) { if (origin.y < base || origin.y > base + o.height) continue }
    else {
      const t0 = (base - origin.y) / dir.y, t1 = (base + o.height - origin.y) / dir.y
      near = Math.max(near, Math.min(t0, t1)); far = Math.min(far, Math.max(t0, t1))
    }
    const enter = Math.max(0, near)
    if (enter <= far && enter < best) best = enter
  }
  return best
}
