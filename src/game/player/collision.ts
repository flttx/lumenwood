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
/** Oriented box on the XZ plane; `angle` is the box's rotation about +Y (same convention as Object3D.rotation.y). */
export interface BoxCollider { x: number; z: number; halfX: number; halfZ: number; angle: number }
/** Pushes a circle out of an oriented box along the shortest way out. Mutates `point`; returns true on contact. */
export function pushOutOfBox(point: PlanarPoint, radius: number, box: BoxCollider) {
  const cos = Math.cos(box.angle), sin = Math.sin(box.angle), wx = point.x - box.x, wz = point.z - box.z
  let lx = wx * cos - wz * sin, lz = wx * sin + wz * cos
  const cx = Math.max(-box.halfX, Math.min(box.halfX, lx)), cz = Math.max(-box.halfZ, Math.min(box.halfZ, lz))
  const dx = lx - cx, dz = lz - cz, d2 = dx * dx + dz * dz
  if (d2 >= radius * radius) return false
  if (d2 > 1e-12) { const d = Math.sqrt(d2); lx = cx + (dx / d) * radius; lz = cz + (dz / d) * radius }
  // Centre inside the box: leave through the nearest face.
  else if (box.halfX - Math.abs(lx) < box.halfZ - Math.abs(lz)) lx = Math.sign(lx || 1) * (box.halfX + radius)
  else lz = Math.sign(lz || 1) * (box.halfZ + radius)
  point.x = box.x + lx * cos + lz * sin; point.z = box.z - lx * sin + lz * cos
  return true
}
