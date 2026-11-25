import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Sphere, Vector3 } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { random } from '../../shared/random'
import { smoothstep } from '../../shared/math'
import { heightAt } from '../../world/terrain/terrain'
import { soundscape } from '../../audio/engine'
import { GATE_DELAY, routeClock } from './progress'
// Mist filling a gated passage (the north corridor, the highland ramp) until its route clears it (a code effect, not a
// model). It hides what lies beyond; the walkable-region clamp is what actually stops the player. One instanced mesh of camera-facing puffs
// (a single draw call). Scene fog is not applied: seen from the trail the puffs sit beyond the fog's near distance and
// would fade into it.
const OPACITY = 0.96, CLEAR_TIME = 2.5, MAX_MIST_DIST = 115
const vertexShader = `varying vec2 vUv; varying float vFar; varying float vSeed;
void main() {
  vUv = uv;
  vSeed = float(gl_InstanceID) * 1.93;
  vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vFar = smoothstep(65.0, 115.0, -centre.z); // visible from mid-valley, fades cleanly before distance cull
  vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  gl_Position = projectionMatrix * (centre + vec4(position.xy * size, 0.0, 0.0));
}`
const fragmentShader = `uniform vec3 uColor; uniform vec3 uRimColor; uniform float uOpacity; uniform float uTime; uniform float uClear;
varying vec2 vUv; varying float vFar; varying float vSeed;
float gmHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gmNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gmHash(i), gmHash(i + vec2(1, 0)), f.x), mix(gmHash(i + vec2(0, 1)), gmHash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 drift = vec2(uTime * 0.07 + vSeed, -uTime * 0.04);
  float n = gmNoise(vUv * 3.4 + drift) * 0.65 + gmNoise(vUv * 7.5 - drift * 1.3) * 0.35;
  float radial = max(0.0, 1.0 - length(vUv - 0.5) * 2.0);
  float wisp = smoothstep(0.14 + uClear * 0.28, 0.88, radial * (0.72 + 0.55 * n));
  float rim = smoothstep(0.05, 0.45, wisp) * (1.0 - smoothstep(0.45, 0.85, wisp)) * uClear * (1.0 - uClear) * 3.2;
  vec3 col = mix(uColor, uRimColor, clamp(rim, 0.0, 0.85));
  gl_FragColor = vec4(col, uOpacity * wisp * (0.4 + 0.6 * wisp) * (1.0 - vFar));
  #include <colorspace_fragment>
}`

export interface MistArea { minX: number; maxX: number; minZ: number; maxZ: number; seed: number }
/** `clearsFrom` returns when the route that opens this gate completed (null while closed); the mist is gone GATE_DELAY later. */
export function GateMist({ area, clearsFrom }: { area: MistArea; clearsFrom: () => number | null }) {
  const { mesh, material, puffs, center } = useMemo(() => {
    const rand = random(area.seed)
    const { minX, maxX, minZ, maxZ } = area
    // Stratified curtain scaled cleanly with passage width: full coverage with low fragment overdraw.
    const count = Math.min(72, Math.max(36, Math.round((maxX - minX) * 2.2)))
    const material = new ShaderMaterial({ uniforms: { uColor: { value: new Color() }, uRimColor: { value: new Color(0xffd788) }, uOpacity: { value: OPACITY }, uTime: { value: 0 }, uClear: { value: 0 } }, vertexShader, fragmentShader, transparent: true, depthWrite: false })
    const mesh = new InstancedMesh(new PlaneGeometry(1, 1), material, count)
    const midX = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2, midY = heightAt(midX, midZ) + 2.5
    const center = new Vector3(midX, midY, midZ)
    mesh.boundingSphere = new Sphere(center.clone(), Math.hypot((maxX - minX) / 2, (maxZ - minZ) / 2) + 9)
    mesh.frustumCulled = true
    const puffs = Array.from({ length: count }, (_, i) => {
      const size = 5.4 + rand() * 3.0
      const frac = (i + rand()) / count
      const x = minX - 1.5 + frac * (maxX - minX + 3.0), z = minZ + rand() * (maxZ - minZ)
      return { home: [x, heightAt(x, z) + 0.8 + rand() * 4.0, z], scale: new Vector3(size * 1.12, size * 0.85, 1), phase: rand() * 6.28 }
    })
    return { mesh, material, puffs, center }
  }, [area])
  useEffect(() => () => { mesh.geometry.dispose(); material.dispose(); mesh.dispose() }, [mesh, material])
  const scratch = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), identity: new Quaternion(), dark: new Color(0x10141f), cleared: false }), [])
  useFrame(({ camera }) => {
    const now = routeClock.now, done = clearsFrom()
    if (done === null) scratch.cleared = false
    // Clears during the last moments of the stream's travel, so the gate is free exactly when it opens.
    const clear = done === null ? 0 : smoothstep(done + GATE_DELAY - CLEAR_TIME, done + GATE_DELAY, now)
    if (clear >= 0.999) { mesh.visible = false; return }
    const distSq = camera.position.distanceToSquared(center)
    if (distSq > MAX_MIST_DIST * MAX_MIST_DIST) { mesh.visible = false; return }
    mesh.visible = true
    const midX = center.x, midZ = center.z
    if (clear > 0.01 && !scratch.cleared) {
      scratch.cleared = true
      if (done !== null && now - done < GATE_DELAY + 1.5) soundscape.event('mistClear', midX, heightAt(midX, midZ) + 1.5, midZ)
    }
    material.uniforms.uOpacity.value = OPACITY * (1 - clear)
    material.uniforms.uTime.value = now
    material.uniforms.uClear.value = clear
    material.uniforms.uColor.value.setHex(atmosphere.preset.fog).lerp(scratch.dark, 0.52)
    puffs.forEach((p, i) => {
      // Slow churn; while clearing the puffs part outward from the passage centerline and lift north.
      const side = p.home[0] >= midX ? 1 : -1
      scratch.position.set(
        p.home[0] + Math.sin(now * 0.23 + p.phase) * 0.4 + side * clear * 3.2,
        p.home[1] + Math.sin(now * 0.17 + p.phase * 2) * 0.2 + clear * 2.2,
        p.home[2] + clear * 3.2,
      )
      mesh.setMatrixAt(i, scratch.matrix.compose(scratch.position, scratch.identity, p.scale))
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh}/>
}
