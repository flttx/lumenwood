import { BufferAttribute, DataTexture, LinearFilter, RingGeometry } from 'three'
// Procedural shapes for the flowers' fake light. Without post-process bloom a small emissive flower reads as a white
// flower, not a light; a soft halo and a pool of light on the ground around it make it read as a source.

/** Unit ring lying flat, opaque along its centre line and fading to nothing at both edges, so it reads as light, not a decal. */
export function softRing() {
  const inner = 0.62, geometry = new RingGeometry(inner, 1, 64, 4).rotateX(-Math.PI / 2)
  const position = geometry.getAttribute('position'), colors = new Float32Array(position.count * 4)
  const mid = (inner + 1) / 2, half = (1 - inner) / 2
  for (let i = 0; i < position.count; i++) {
    const a = Math.max(0, 1 - Math.abs(Math.hypot(position.getX(i), position.getZ(i)) - mid) / half)
    colors.set([1, 1, 1, a * a], i * 4)
  }
  return geometry.setAttribute('color', new BufferAttribute(colors, 4))
}

/** Falloff of a glow at `r` (0 centre, 1 edge): a bright core easing into a long, faint tail, 0 at the edge. */
export function glowFalloff(r: number) {
  const t = Math.max(0, 1 - r)
  return t * t * (0.35 + 0.65 * t * t)
}

/** White radial glow texture (brightness in RGB, so it suits additive blending); tint with the material colour. */
export function radialGlowTexture(size = 64) {
  const data = new Uint8Array(size * size * 4), c = (size - 1) / 2
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = Math.round(255 * glowFalloff(Math.hypot(x - c, y - c) / c))
    data.set([v, v, v, 255], (y * size + x) * 4)
  }
  const texture = new DataTexture(data, size, size)
  // Left in linear colour space on purpose: the falloff is shaped for additive blending in linear light.
  texture.magFilter = texture.minFilter = LinearFilter; texture.needsUpdate = true
  return texture
}
