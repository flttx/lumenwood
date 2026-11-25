import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Group, MeshStandardMaterial, Points, TubeGeometry, Vector3, type WebGLProgramParametersWithUniforms } from 'three'
import { route, routeClock } from '../route/progress'
import { createMoteMaterial } from '../route/moteMaterial'
import { random } from '../../shared/random'
import { SUN_BRIDGE, sunlightDeckHeight } from './layout'
import { VineLeaves } from './VineLeaves'

const SPROUT_MOTES = 24

function patchGrow(material: MeshStandardMaterial, shared: { uGrow: { value: number }; uLength: { value: number } }) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, shared)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uGrow; uniform float uLength; varying float vVineZ; varying float vVineX;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vVineZ = transformed.z / max(uLength, 0.01);
  vVineX = min(1.0, abs(transformed.x) / 1.4);
  float frontier = clamp(uGrow * 1.18 - vVineX * 0.18, 0.0, 1.0);
  float tipDip = 1.0 - smoothstep(max(0.0, frontier - 0.08), frontier, vVineZ);
  transformed.y -= (1.0 - tipDip) * 0.07 * step(uGrow, 0.995);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGrow; varying float vVineZ; varying float vVineX;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  float frontier = clamp(uGrow * 1.18 - vVineX * 0.18, 0.0, 1.0);
  if (vVineZ > frontier) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float lead = smoothstep(max(0.0, frontier - 0.08), frontier, vVineZ) * step(uGrow, 0.995);
  totalEmissiveRadiance += vec3(0.95, 0.88, 0.42) * lead * 1.15;`)
  }
  material.customProgramCacheKey = () => 'lumenwood-vine-grow'
}

/** TEMPORARY woven vines for playtesting. Progressive staggered vine growth matches the collision arch. */
export function VineBridge() {
  const dpr = useThree(s => s.viewport.dpr)
  const group = useRef<Group>(null!)
  const motesRef = useRef<Points>(null!)
  const items = useMemo(() => {
    const length = SUN_BRIDGE.to - SUN_BRIDGE.from
    const shared = { uGrow: { value: 0 }, uLength: { value: length } }
    const material = new MeshStandardMaterial({ color: 0x586c35, roughness: 0.95 })
    const ribs = new MeshStandardMaterial({ color: 0x6a5739, roughness: 1 })
    patchGrow(material, shared); patchGrow(ribs, shared)
    const arch = (t: number) => sunlightDeckHeight(SUN_BRIDGE.x, SUN_BRIDGE.from + t * length, true)
    const ropes = Array.from({ length: 9 }, (_, i) => {
      const x = -SUN_BRIDGE.halfWidth + 0.13 + i * (2 * SUN_BRIDGE.halfWidth - 0.26) / 8
      return new TubeGeometry(new CatmullRomCurve3(Array.from({ length: 33 }, (_, j) => { const t = j / 32, weave = Math.sin(Math.PI * t); return new Vector3(x + Math.sin(t * 22 + i * 1.8) * 0.07 * weave, arch(t) - 0.12 + Math.sin(t * 18 + i) * 0.025 * weave, t * length) })), 40, 0.11 + i % 3 * 0.008, 6, false)
    })
    const cross = Array.from({ length: 14 }, (_, i) => {
      const t = (i + 0.5) / 14
      return new TubeGeometry(new CatmullRomCurve3([new Vector3(-1.3, arch(t) - 0.04, t * length), new Vector3(-0.4, arch(t) + 0.01, t * length - 0.16), new Vector3(0.5, arch(t) - 0.02, t * length + 0.1), new Vector3(1.3, arch(t) - 0.04, t * length + Math.sin(i) * 0.2)]), 12, 0.04, 5, false)
    })
    const rand = random(97)
    const moteGeo = new BufferGeometry()
    moteGeo.setAttribute('position', new BufferAttribute(new Float32Array(SPROUT_MOTES * 3), 3))
    moteGeo.setAttribute('aAlpha', new BufferAttribute(new Float32Array(SPROUT_MOTES), 1))
    const moteMat = createMoteMaterial(0xdcf49a)
    const seeds = Array.from({ length: SPROUT_MOTES }, () => [(rand() - 0.5) * 2.4, rand(), rand() * Math.PI * 2, 0.6 + rand() * 0.8] as const)
    return { shared, material, ribs, ropes, cross, length, arch, moteGeo, moteMat, seeds }
  }, [])
  useEffect(() => () => {
    items.material.dispose(); items.ribs.dispose(); items.moteGeo.dispose(); items.moteMat.dispose()
    ;[...items.ropes, ...items.cross].forEach(g => g.dispose())
  }, [items])
  useFrame(() => {
    const g = route.sunlight.growth
    group.current.visible = g > 0.005
    items.shared.uGrow.value = g
    const sprouting = g > 0.02 && g < 0.99
    motesRef.current.visible = sprouting
    if (!sprouting) return
    const now = routeClock.now, pos = items.moteGeo.attributes.position as BufferAttribute, alp = items.moteGeo.attributes.aAlpha as BufferAttribute
    items.seeds.forEach(([across, phase, angle, rise], i) => {
      const life = (phase + now * 0.85) % 1
      const zFrac = Math.max(0, Math.min(1, g - life * 0.08))
      pos.setXYZ(i, across + Math.sin(now * 3 + angle) * 0.16, items.arch(zFrac) + life * 1.15 * rise, zFrac * items.length)
      alp.setX(i, Math.sin(life * Math.PI) * 0.85)
    })
    pos.needsUpdate = alp.needsUpdate = true
    items.moteMat.uniforms.uTime.value = now; items.moteMat.uniforms.uSize.value = 72 * dpr; items.moteMat.uniforms.uOpacity.value = 0.8
  })
  return <group ref={group} name="Sunlight-Temporary-Vine-Bridge" position={[SUN_BRIDGE.x, 0, SUN_BRIDGE.from]} visible={false}>
    {items.ropes.map((g, i) => <mesh key={`rope-${i}`} geometry={g} material={items.material} castShadow receiveShadow/>)}
    {items.cross.map((g, i) => <mesh key={`cross-${i}`} geometry={g} material={items.ribs} castShadow receiveShadow/>)}
    <points ref={motesRef} geometry={items.moteGeo} material={items.moteMat} visible={false} frustumCulled={false}/>
    <VineLeaves/>
  </group>
}
