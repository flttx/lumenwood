import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, CylinderGeometry, IcosahedronGeometry, Mesh, MeshStandardMaterial, ShaderMaterial, Sprite, SpriteMaterial } from 'three'
import { heightAt } from '../../world/terrain/terrain'
import { seeds } from '../../world/zones/sideLayout'
import { route, routeClock } from '../route/progress'
import { radialGlowTexture } from '../flora/glowSprites'
import { atmosphere } from '../../rendering/timeOfDay'
import { seedAvailable } from './secrets'
// Light seeds (2026-11-12): a small golden core bobbing over the ground in a soft halo, under a faint shaft of light tall
// enough to be spotted over the undergrowth from a distance (A Short Hike's lesson: small rewards you can see and reach).
// A picked-up seed shrinks into the player's light over half a second.
const BEAM_HEIGHT = 7, PICKUP = 0.5
const beamVertex = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const beamFragment = `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
void main() {
  float side = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float flicker = 0.8 + 0.2 * sin(uTime * 2.0 + vUv.y * 9.0);
  gl_FragColor = vec4(uColor * pow(max(side, 0.0), 3.0) * pow(max(1.0 - vUv.y, 0.0), 1.5) * flicker * uOpacity, 1.0);
}`

export function Seeds() {
  const items = useMemo(() => {
    const coreGeometry = new IcosahedronGeometry(0.15, 1), beamGeometry = new CylinderGeometry(0.22, 0.22, BEAM_HEIGHT, 12, 1, true).translate(0, BEAM_HEIGHT / 2, 0)
    const texture = radialGlowTexture()
    return seeds.map(s => {
      const ground = heightAt(s.x, s.z)
      const core = new Mesh(coreGeometry, new MeshStandardMaterial({ color: 0xffd889, emissive: new Color(0xffb84a), emissiveIntensity: 1.1, roughness: 0.4 }))
      const halo = new Sprite(new SpriteMaterial({ map: texture, color: 0xffcf7a, blending: AdditiveBlending, transparent: true, depthWrite: false }))
      halo.scale.setScalar(0.9)
      const beam = new Mesh(beamGeometry, new ShaderMaterial({ uniforms: { uColor: { value: new Color(0xffd28a) }, uOpacity: { value: 0 }, uTime: { value: 0 } }, vertexShader: beamVertex, fragmentShader: beamFragment, blending: AdditiveBlending, transparent: true, depthWrite: false }))
      beam.position.set(s.x, ground, s.z)
      return { ground, core, halo, beam, x: s.x, z: s.z }
    })
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, now = routeClock.now
    items.forEach((it, i) => {
      const taken = route.seedsAt.get(i), shown = seedAvailable(route, i) ? 1 : taken !== undefined ? Math.max(0, 1 - (now - taken) / PICKUP) : 0
      const visible = shown > 0.001
      it.core.visible = it.halo.visible = it.beam.visible = visible
      if (!visible) return
      const y = it.ground + 0.75 + Math.sin(t * 1.6 + i) * 0.12 + (1 - shown) * 1.2
      it.core.position.set(it.x, y, it.z); it.core.rotation.y = t * 0.8; it.core.scale.setScalar(shown)
      it.halo.position.copy(it.core.position); it.halo.scale.setScalar(0.9 * shown * (0.9 + 0.1 * Math.sin(t * 3 + i)))
      // Kept under the bloom threshold at night: up close a brighter halo bloomed into a white-out.
      ;(it.halo.material as SpriteMaterial).opacity = 0.4 - 0.15 * atmosphere.preset.fireflies
      const u = (it.beam.material as ShaderMaterial).uniforms
      u.uTime.value = t; u.uOpacity.value = shown * (0.3 + 0.1 * atmosphere.preset.fireflies)
    })
  })
  return <>{items.map((it, i) => <group key={i}><primitive object={it.core}/><primitive object={it.halo}/><primitive object={it.beam}/></group>)}</>
}
