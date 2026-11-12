import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { random } from '../../shared/random'
import { smoothstep } from '../../shared/math'
import { heightAt } from '../../world/terrain/terrain'
import { GATE_DELAY, routeClock } from './progress'
// Mist filling a gated passage (the north corridor, the highland ramp) until its route clears it (a code effect, not a
// model). It hides what lies beyond; the walkable-region clamp is what actually stops the player. One instanced mesh of camera-facing puffs
// (a single draw call). Scene fog is not applied: seen from the trail the puffs sit beyond the fog's near distance and
// would fade into it.
const PUFFS = 42, OPACITY = 0.95, CLEAR_TIME = 2.5
const vertexShader = `varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  gl_Position = projectionMatrix * (centre + vec4(position.xy * size, 0.0, 0.0));
}`
const fragmentShader = `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
void main() {
  float t = max(0.0, 1.0 - length(vUv - 0.5) * 2.0);
  gl_FragColor = vec4(uColor, uOpacity * t * t * (0.35 + 0.65 * t * t));
  #include <colorspace_fragment>
}`

export interface MistArea { minX: number; maxX: number; minZ: number; maxZ: number; seed: number }
/** `clearsFrom` returns when the route that opens this gate completed (null while closed); the mist is gone GATE_DELAY later. */
export function GateMist({ area, clearsFrom }: { area: MistArea; clearsFrom: () => number | null }) {
  const { mesh, material, puffs } = useMemo(() => {
    const rand = random(area.seed)
    const material = new ShaderMaterial({ uniforms: { uColor: { value: new Color() }, uOpacity: { value: OPACITY } }, vertexShader, fragmentShader, transparent: true, depthWrite: false })
    const mesh = new InstancedMesh(new PlaneGeometry(1, 1), material, PUFFS)
    mesh.frustumCulled = false
    const { minX, maxX, minZ, maxZ } = area
    const puffs = Array.from({ length: PUFFS }, () => {
      const size = 2.6 + rand() * 2
      const x = minX - 1.2 + rand() * (maxX - minX + 2.4), z = minZ + rand() * (maxZ - minZ)
      return { home: [x, heightAt(x, z) + 0.3 + rand() * 2.4, z], scale: new Vector3(size, size * 0.8, 1), phase: rand() * 6.28 }
    })
    return { mesh, material, puffs }
  }, [area])
  const scratch = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), identity: new Quaternion(), dark: new Color(0x10141f) }), [])
  useFrame(() => {
    const now = routeClock.now, done = clearsFrom()
    // Clears during the last moments of the stream's travel, so the gate is free exactly when it opens.
    const clear = done === null ? 0 : smoothstep(done + GATE_DELAY - CLEAR_TIME, done + GATE_DELAY, now)
    mesh.visible = clear < 0.999
    if (!mesh.visible) return
    material.uniforms.uOpacity.value = OPACITY * (1 - clear)
    material.uniforms.uColor.value.setHex(atmosphere.preset.fog).lerp(scratch.dark, 0.6)
    puffs.forEach((p, i) => {
      // Slow churn; while clearing the puffs also lift and drift north.
      scratch.position.set(p.home[0] + Math.sin(now * 0.23 + p.phase) * 0.4, p.home[1] + Math.sin(now * 0.17 + p.phase * 2) * 0.2 + clear * 2, p.home[2] + clear * 3)
      mesh.setMatrixAt(i, scratch.matrix.compose(scratch.position, scratch.identity, p.scale))
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh}/>
}
