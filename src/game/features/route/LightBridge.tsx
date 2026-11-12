import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Group, Mesh, PlaneGeometry, Points, ShaderMaterial, TubeGeometry, Vector3 } from 'three'
import { BRIDGE, BRIDGE_ARCH, bridgeDeck } from '../../world/regions'
import { WATER_LEVEL } from '../../world/zones/wetlandLayout'
import { atmosphere } from '../../rendering/timeOfDay'
import { lightSource, lightSources } from '../../rendering/LocalLights'
import { random } from '../../shared/random'
import { GATE_DELAY, route, routeClock } from './progress'
import { createMoteMaterial } from './moteMaterial'
// The light bridge over the wetland channel (a magic effect, built in code; 2026-11-12 rework of the earlier glowing
// pads). An arched deck of translucent light laid in planks, a ribbon handrail on each side on slender light posts, a
// faint reflection in the water and motes drifting up off it. When the wetland stream arrives it is laid from the south
// bank to the north, finished exactly when the bridge gate opens; afterwards light pulses keep running across it.
const WIDTH = BRIDGE.maxX - BRIDGE.minX - 1.4, LENGTH = BRIDGE.maxZ - BRIDGE.minZ, CX = (BRIDGE.minX + BRIDGE.maxX) / 2
const RAIL_HEIGHT = 0.95, POST_STEP = 1.6, SEGMENTS = 48, MOTES = 90
const WARM = new Color(0xffd79a), EDGE = new Color(0xfff2d0)

const deckVertex = `uniform float uLength; varying vec2 vUv; varying float vAlong;
void main() { vUv = uv; vAlong = uv.y * uLength; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
// uBuilt: how far (0..1 of the length) the bridge has been laid; a bright seam rides the leading edge.
const deckFragment = `uniform vec3 uColor; uniform vec3 uEdge; uniform float uBuilt; uniform float uTime; uniform float uOpacity; uniform float uLength;
varying vec2 vUv; varying float vAlong;
void main() {
  if (vUv.y > uBuilt) discard;
  float plank = smoothstep(0.0, 0.08, fract(vAlong / 0.42)) * smoothstep(1.0, 0.86, fract(vAlong / 0.42));
  float side = abs(vUv.x - 0.5) * 2.0, rim = smoothstep(0.75, 1.0, side);
  float pulse = pow(0.5 + 0.5 * sin(vAlong * 1.3 - uTime * 2.2), 6.0);
  float seam = smoothstep(uBuilt - 0.04, uBuilt, vUv.y) * step(uBuilt, 0.999);
  vec3 col = uColor * (0.22 + 0.22 * plank + 0.32 * pulse) + uEdge * (rim * 0.7 + seam * 2.0);
  float alpha = (0.3 + 0.18 * plank + 0.3 * rim + 0.2 * pulse + seam) * uOpacity;
  gl_FragColor = vec4(col * alpha, 1.0);
  #include <colorspace_fragment>
}`
const railFragment = `uniform vec3 uColor; uniform float uBuilt; uniform float uTime; uniform float uOpacity; varying vec2 vUv;
void main() {
  if (vUv.x > uBuilt) discard;
  float flow = 0.55 + 0.45 * sin(vUv.x * 40.0 - uTime * 3.0);
  gl_FragColor = vec4(uColor * flow * uOpacity, 1.0);
  #include <colorspace_fragment>
}`
const railVertex = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'

/** A strip along the bridge (uv.y runs south → north), bent to the arch and lifted by `lift`. */
function deckGeometry(lift: number) {
  const geometry = new PlaneGeometry(WIDTH, LENGTH, 6, SEGMENTS).rotateX(-Math.PI / 2)
  const p = geometry.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const z = BRIDGE.minZ + LENGTH / 2 - p.getZ(i) // PlaneGeometry's +y became -z; flip so uv.y grows northward
    p.setXYZ(i, CX + p.getX(i), bridgeDeck(z) + lift, z)
  }
  geometry.computeVertexNormals()
  return geometry
}
function railGeometry(x: number) {
  const points = Array.from({ length: 24 }, (_, i) => { const z = BRIDGE.minZ + (i / 23) * LENGTH; return new Vector3(x, bridgeDeck(z) + RAIL_HEIGHT * Math.sin(Math.PI * Math.min(1, Math.min(i, 23 - i) / 2.5) / 2), z) })
  return new TubeGeometry(new CatmullRomCurve3(points), 96, 0.045, 6)
}

export function LightBridge() {
  const dpr = useThree(s => s.viewport.dpr)
  const parts = useMemo(() => {
    const uniforms = { uColor: { value: WARM }, uEdge: { value: EDGE }, uBuilt: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 1 }, uLength: { value: LENGTH } }
    const additive = { transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false } as const
    const deckMaterial = new ShaderMaterial({ uniforms, vertexShader: deckVertex, fragmentShader: deckFragment, ...additive })
    const reflectionUniforms = { ...uniforms, uOpacity: { value: 0.15 } }
    const reflectionMaterial = new ShaderMaterial({ uniforms: reflectionUniforms, vertexShader: deckVertex, fragmentShader: deckFragment, ...additive })
    const railMaterial = new ShaderMaterial({ uniforms: { uColor: { value: EDGE }, uBuilt: uniforms.uBuilt, uTime: uniforms.uTime, uOpacity: { value: 0.28 } }, vertexShader: railVertex, fragmentShader: railFragment, ...additive })
    const group = new Group()
    group.add(new Mesh(deckGeometry(0.02), deckMaterial))
    for (const x of [CX - WIDTH / 2, CX + WIDTH / 2]) group.add(new Mesh(railGeometry(x), railMaterial))
    // Posts: thin vertical light bars along both rails, laid with the deck (each hides until the deck reaches it).
    const posts: Mesh[] = []
    for (let z = BRIDGE.minZ + 0.8; z < BRIDGE.maxZ - 0.6; z += POST_STEP) for (const x of [CX - WIDTH / 2, CX + WIDTH / 2]) {
      const post = new Mesh(new PlaneGeometry(0.06, RAIL_HEIGHT).translate(0, RAIL_HEIGHT / 2, 0), railMaterial)
      post.position.set(x, bridgeDeck(z), z); post.userData.at = (z - BRIDGE.minZ) / LENGTH
      posts.push(post); group.add(post)
    }
    // Reflection: the deck mirrored about the water surface, faint.
    const reflection = new Mesh(deckGeometry(0.02), reflectionMaterial)
    reflection.scale.y = -1; reflection.position.y = 2 * WATER_LEVEL
    group.add(reflection)
    // Motes drifting up off the deck.
    const rand = random(71), moteGeometry = new BufferGeometry()
    moteGeometry.setAttribute('position', new BufferAttribute(new Float32Array(MOTES * 3), 3))
    moteGeometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(MOTES), 1))
    const seeds = Array.from({ length: MOTES }, () => [rand(), rand() - 0.5, rand(), 0.4 + rand() * 0.6])
    const moteMaterial = createMoteMaterial(0xffe6b0), motes = new Points(moteGeometry, moteMaterial)
    motes.frustumCulled = false; group.add(motes)
    const sources = [0.2, 0.5, 0.8].map(t => lightSource([CX, BRIDGE_ARCH * Math.sin(Math.PI * t) + 0.8, BRIDGE.minZ + t * LENGTH], 0xffcf88, 2.2, 9))
    group.visible = false
    return { group, uniforms, reflectionUniforms, posts, moteGeometry, moteMaterial, seeds, sources, materials: [deckMaterial, reflectionMaterial, railMaterial] }
  }, [])
  useEffect(() => {
    parts.sources.forEach(s => lightSources.add(s))
    return () => {
      parts.sources.forEach(s => lightSources.delete(s))
      parts.group.traverse(o => { if (o instanceof Mesh) o.geometry.dispose() })
      parts.materials.forEach(m => m.dispose()); parts.moteGeometry.dispose(); parts.moteMaterial.dispose()
    }
  }, [parts])
  useFrame(() => {
    const done = route.completedAt.wetland, now = routeClock.now
    parts.group.visible = done !== null
    if (done === null) { parts.sources.forEach(s => { s.level = 0 }); return }
    // Laid south to north while the stream travels, finished as the gate opens (GATE_DELAY).
    const built = Math.min(1, Math.max(0, (now - done) / (GATE_DELAY * 0.95)))
    const night = 0.55 + 0.45 * atmosphere.preset.fireflies
    parts.uniforms.uBuilt.value = built; parts.uniforms.uTime.value = now; parts.uniforms.uOpacity.value = night
    parts.reflectionUniforms.uOpacity.value = 0.15 * night
    parts.posts.forEach(p => { p.visible = (p.userData.at as number) <= built })
    parts.sources.forEach((s, i) => { s.level = Math.min(1, Math.max(0, built * 3 - i)) * atmosphere.preset.fireflies })
    const position = parts.moteGeometry.getAttribute('position') as BufferAttribute, alpha = parts.moteGeometry.getAttribute('aAlpha') as BufferAttribute
    parts.seeds.forEach(([along, across, phase, speed], i) => {
      const life = (phase + now * 0.18 * speed) % 1, z = BRIDGE.minZ + along * LENGTH
      position.setXYZ(i, CX + across * WIDTH * 1.1, bridgeDeck(z) + life * 2.6, z + Math.sin(now + i) * 0.2)
      alpha.setX(i, along <= built ? Math.sin(Math.PI * life) : 0)
    })
    position.needsUpdate = alpha.needsUpdate = true
    parts.moteMaterial.uniforms.uTime.value = now; parts.moteMaterial.uniforms.uSize.value = 60 * dpr; parts.moteMaterial.uniforms.uOpacity.value = night
  })
  return <primitive object={parts.group}/>
}
