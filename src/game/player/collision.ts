export interface CircleCollider { x: number; z: number; radius: number }
export interface PlanarPoint { x: number; z: number }
/**
 * Pushes a circle out of overlapping circle colliders on the XZ plane. Mutates `point`; returns true on contact.
 * Repeats until a pass finds no overlap. In gaps narrower than the player (adjacent trunks) the alternating pushes
 * converge geometrically; residual penetration after maxPasses is sub-centimetre and keeps shrinking on later frames.
 */
export function resolveCollisions(point: PlanarPoint, radius: number, colliders: readonly CircleCollider[], maxPasses = 6) {
  let hit = false
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false
    for (const c of colliders) {
      let dx = point.x - c.x, dz = point.z - c.z
      const min = radius + c.radius, d2 = dx * dx + dz * dz
      if (d2 >= min * min) continue
      let d = Math.sqrt(d2)
      if (d < 1e-6) { dx = 1; dz = 0; d = 1 }
      point.x = c.x + (dx / d) * min; point.z = c.z + (dz / d) * min
      hit = moved = true
    }
    if (!moved) break
  }
  return hit
}
