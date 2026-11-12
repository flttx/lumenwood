import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, PlaneGeometry, Points, ShaderMaterial } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { lightSource, lightSources } from '../../rendering/LocalLights'
import { random } from '../../shared/random'
// The camp's fire (scene enrichment, 2026-11-12). PRP-004 is only the stone ring and logs; the flame, sparks and smoke
// are code effects (procedural particles) and the warmth on the cabin, ground and player is a real light source
// (LocalLights) that flickers with the flame. Burns day and night; the light only matters once the sun is low.
const FLAME_HEIGHT = 1.1, SPARKS = 40, SMOKE = 14, SMOKE_GREY = new Color(0x8a8580)
const flameVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const flameFragment = `uniform float uTime; uniform float uSeed; uniform float uPower; varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vUv; float t = uTime * 1.8 + uSeed;
  // Rising turbulence bends the tongue; the flame narrows toward the tip.
  float n = noise(vec2(p.x * 4.0 + uSeed, p.y * 3.0 - t * 1.6)) * 0.6 + noise(vec2(p.x * 9.0, p.y * 7.0 - t * 2.7)) * 0.4;
  float x = (p.x - 0.5 + (n - 0.5) * 0.35 * p.y) * 2.0;
  float width = (1.0 - p.y) * (0.55 + 0.45 * smoothstep(0.0, 0.25, p.y));
  float body = smoothstep(width, width * 0.35, abs(x)) * smoothstep(1.0, 0.45 + 0.4 * n, p.y) * smoothstep(0.0, 0.08, p.y);
  vec3 col = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.62, 0.18), smoothstep(0.15, 0.6, body));
  col = mix(col, vec3(1.0, 0.92, 0.7), smoothstep(0.7, 1.0, body) * (1.0 - p.y));
  gl_FragColor = vec4(col * body * uPower * 1.1, 1.0);
}`
const sparkVertex = `uniform float uTime; uniform float uSize; attribute vec3 aSpark; varying float vLife;
void main() {
  float life = fract(uTime * (0.35 + 0.3 * aSpark.y) + aSpark.x);
  vec3 p = vec3(sin(aSpark.x * 40.0 + life * 3.0) * 0.25 * life, 0.3 + life * 3.2, cos(aSpark.z * 40.0 + life * 2.0) * 0.25 * life);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vLife = life;
  gl_PointSize = uSize * (1.0 - life) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const sparkFragment = `uniform float uPower; varying float vLife;
void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.55, 0.15) * smoothstep(0.5, 0.0, d) * (1.0 - vLife) * uPower * 2.0, 1.0); }`
const smokeVertex = `uniform float uTime; uniform float uSize; attribute vec3 aPuff; varying float vLife;
void main() {
  float life = fract(uTime * 0.09 + aPuff.x);
  vec3 p = vec3(sin(aPuff.y * 30.0) * 0.3 + life * 1.5, 1.0 + life * 6.0, cos(aPuff.z * 30.0) * 0.3 + life * 0.6);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vLife = life;
  gl_PointSize = uSize * (0.4 + life * 1.6) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const smokeFragment = `uniform vec3 uColor; uniform float uOpacity; varying float vLife;
void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor, smoothstep(0.5, 0.1, d) * sin(vLife * 3.14159) * uOpacity); }`

export function CampfireEffects({ x, y, z }: { x: number; y: number; z: number }) {
  const dpr = useThree(s => s.viewport.dpr)
  const fx = useMemo(() => {
    const group = new Group(), uniforms = { uTime: { value: 0 }, uPower: { value: 1 } }
    // Three crossed planes so the flame has body from every side.
    const flames = [0, 1, 2].map(i => {
      const material = new ShaderMaterial({ uniforms: { ...uniforms, uSeed: { value: i * 7.3 } }, vertexShader: flameVertex, fragmentShader: flameFragment, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide })
      const mesh = new Mesh(new PlaneGeometry(0.9, FLAME_HEIGHT).translate(0, FLAME_HEIGHT / 2 + 0.12, 0), material)
      mesh.rotation.y = (i * Math.PI) / 3
      group.add(mesh)
      return material
    })
    const rand = random(431), attr = (n: number) => { const a = new Float32Array(n * 3); for (let i = 0; i < a.length; i++) a[i] = rand(); return a }
    const sparkGeometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(SPARKS * 3), 3)).setAttribute('aSpark', new BufferAttribute(attr(SPARKS), 3))
    const sparkMaterial = new ShaderMaterial({ uniforms: { ...uniforms, uSize: { value: 0 } }, vertexShader: sparkVertex, fragmentShader: sparkFragment, transparent: true, depthWrite: false, blending: AdditiveBlending })
    const sparks = new Points(sparkGeometry, sparkMaterial)
    const smokeGeometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(SMOKE * 3), 3)).setAttribute('aPuff', new BufferAttribute(attr(SMOKE), 3))
    const smokeMaterial = new ShaderMaterial({ uniforms: { uTime: uniforms.uTime, uSize: { value: 0 }, uColor: { value: new Color() }, uOpacity: { value: 0 } }, vertexShader: smokeVertex, fragmentShader: smokeFragment, transparent: true, depthWrite: false })
    const smoke = new Points(smokeGeometry, smokeMaterial)
    for (const p of [sparks, smoke]) { p.frustumCulled = false; group.add(p) }
    group.position.set(x, y, z)
    return { group, uniforms, flames, sparkMaterial, smokeMaterial, source: lightSource([x, y + 1.0, z], 0xff9a48, 24, 18) }
  }, [x, y, z])
  useEffect(() => {
    lightSources.add(fx.source)
    return () => {
      lightSources.delete(fx.source)
      fx.group.traverse(o => { if (o instanceof Mesh || o instanceof Points) { o.geometry.dispose(); (o.material as ShaderMaterial).dispose() } })
    }
  }, [fx])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, dusk = atmosphere.blend
    // Flicker from a few incommensurate waves: the flame, sparks and light breathe together.
    const flicker = 0.85 + 0.09 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 17.9 + 1.3) + 0.05 * Math.sin(t * 5.1)
    fx.uniforms.uTime.value = t; fx.uniforms.uPower.value = flicker * (0.55 + 0.45 * dusk)
    fx.sparkMaterial.uniforms.uSize.value = 26 * dpr
    fx.smokeMaterial.uniforms.uSize.value = 220 * dpr
    fx.smokeMaterial.uniforms.uColor.value.setHex(atmosphere.preset.fog).lerp(SMOKE_GREY, 0.5)
    // Smoke reads by day; at night it would only grey out the glow.
    fx.smokeMaterial.uniforms.uOpacity.value = 0.22 * (1 - 0.7 * dusk)
    fx.source.level = flicker * (0.15 + 0.85 * dusk)
  })
  return <primitive object={fx.group}/>
}
