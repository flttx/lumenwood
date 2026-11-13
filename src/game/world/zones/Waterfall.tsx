import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, MeshStandardMaterial, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3, type Material, type WebGLProgramParametersWithUniforms } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { heightAt } from '../terrain/terrain'
import { WATERFALL } from './sideLayout'
import { WATER_LEVEL } from './wetlandLayout'
import { secretFx } from '../../features/secrets/fx'
// The glen's waterfall, third version (2026-11-13). The second version still looked fake and, worse, seemed to flow
// upward: its streaks scrolled at a speed that depended on height (time × a position-dependent factor), so the pattern
// compressed and crept up the longer the game ran. Technique learned (read only, no code copied; user's exception to the
// project's independence rule, 2026-11-13) from the sibling project's creek falls:
// - the curtain's geometry is a ballistic sheet: water leaves the lip with a little forward speed and falls under
//   gravity, and the sheet's texture coordinate v is *fall time*, not height. Streaks scroll at one constant speed in v,
//   so in space they start slow at the lip and accelerate down the fall, stretching as they go;
// - a lit standard material (the sun, sky and moon shade it like everything else) patched with the water pattern: a
//   smooth glassy tongue over the lip, racing white streaks below, and an outer curtain that parts into ropes of water
//   showing a darker, slower inner curtain behind;
// - spray arcs from the plunge, mist that dims with the light, and churned foam spreading on the pool (noise sampled by
//   direction vector, so there is no angular seam).
const ROWS = 32, COLUMNS = 14, GRAVITY = 9.8, LIP_SPEED = 1.6, SPRAY = 220, MIST = 8
/** Where the water leaves the cliff top (just behind the PRP-009 ledge's worn channel). */
export const waterfallTop = () => heightAt(WATERFALL.x - 1, WATERFALL.z) + 0.1
const fallTime = () => Math.sqrt((2 * (waterfallTop() - WATER_LEVEL)) / GRAVITY)
/** Where the curtain meets the pool. */
const footX = () => WATERFALL.x + LIP_SPEED * fallTime()

/** Ballistic curtain: row i is the water i/ROWS of the way through its fall; it widens a little as it drops. */
function curtain(back: number, width: number) {
  const top = waterfallTop(), total = fallTime(), half = (WATERFALL.width / 2) * width, positions: number[] = [], uvs: number[] = [], index: number[] = []
  for (let i = 0; i <= ROWS; i++) {
    const v = i / ROWS, t = total * v, y = top - 0.5 * GRAVITY * t * t
    for (let j = 0; j <= COLUMNS; j++) {
      const u = j / COLUMNS, across = u * 2 - 1
      // The middle carries more water and is thrown a little further than the thinning sides.
      const x = WATERFALL.x + LIP_SPEED * t * (1 - 0.25 * across * across) + 0.15 * (1 - across * across) + back
      positions.push(x, y, WATERFALL.z + across * half * (1 + 0.3 * v)); uvs.push(u, v)
      if (i < ROWS && j < COLUMNS) { const k = i * (COLUMNS + 1) + j; index.push(k, k + COLUMNS + 1, k + 1, k + 1, k + COLUMNS + 1, k + COLUMNS + 2) }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2)); geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

const noiseLib = `float wfHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wfNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wfHash(i), wfHash(i + vec2(1, 0)), f.x), mix(wfHash(i + vec2(0, 1)), wfHash(i + vec2(1, 1)), f.x), f.y); }`
/** Water pattern for one curtain layer. `speed` slows the inner layer, `ropes` lets the outer one part, `shade` darkens. */
const curtainBody = (speed: number, opacity: number, ropes: number, shade: number) => `
  float t = uWfTime * ${speed.toFixed(2)};
  vec2 q = vWfUv; // u across, v = fall time (0 at the lip)
  float streak = wfNoise(vec2(q.x * 17.0, q.y * 3.2 - t * 3.0)) * 0.6 + wfNoise(vec2(q.x * 43.0, q.y * 7.5 - t * 4.4)) * 0.4;
  float tongue = 1.0 - smoothstep(0.06, 0.34, q.y + (wfNoise(vec2(q.x * 9.0, t * 0.7)) - 0.5) * 0.1);
  float side = q.x < 0.5 ? 0.0 : 7.0;
  float edge = abs(q.x * 2.0 - 1.0) + (wfNoise(vec2(side, q.y * 5.0 - t * 2.2)) - 0.5) * 0.22;
  vec3 white = mix(vec3(0.42, 0.58, 0.58), vec3(0.94, 0.97, 0.96), smoothstep(0.4, 0.78, streak) * 0.65 + smoothstep(0.6, 1.0, q.y) * 0.35);
  vec3 glass = mix(vec3(0.2, 0.34, 0.35), vec3(0.55, 0.7, 0.7), smoothstep(0.45, 0.8, wfNoise(vec2(q.x * 7.0, q.y * 2.0 - t * 1.5))));
  float ropeField = wfNoise(vec2(q.x * 13.0, q.y * 0.8 - t * 0.25)) * 0.7 + wfNoise(vec2(q.x * 31.0, q.y * 1.6 - t * 0.4)) * 0.3;
  float rope = smoothstep(0.36, 0.6, ropeField), rim = 1.0 - smoothstep(0.0, 0.06, abs(ropeField - 0.48));
  float parted = ${ropes.toFixed(2)} * (1.0 - tongue) * smoothstep(0.12, 0.35, q.y);
  vec3 body = mix(white, glass, tongue * 0.9);
  body = mix(body, mix(vec3(0.24, 0.4, 0.42), body, 0.45), 1.0 - ${shade.toFixed(2)});
  diffuseColor.rgb = body * ${shade.toFixed(2)} * mix(1.0, 0.88 + 0.24 * rope + 0.15 * rim, parted);
  diffuseColor.rgb = mix(diffuseColor.rgb, uWfGold, uWfGlow * (0.3 + 0.5 * smoothstep(0.4, 0.8, streak)));
  diffuseColor.a = mix(0.36 + 0.55 * smoothstep(0.3, 0.75, streak), 0.72, tongue) * (1.0 - smoothstep(0.72, 1.0, edge + (streak - 0.5) * 0.2))
    * mix(1.0, 0.06 + 0.94 * rope, parted) * ${opacity.toFixed(2)};`

function curtainMaterial(key: string, color: number, body: string, shared: Record<string, { value: unknown }>) {
  const material = new MeshStandardMaterial({ color, roughness: 0.32, transparent: true, depthWrite: false, side: DoubleSide })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, shared)
    shader.vertexShader = 'varying vec2 vWfUv;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvWfUv = uv;')
    shader.fragmentShader = `uniform float uWfTime; uniform vec3 uWfGold; uniform float uWfGlow; varying vec2 vWfUv;\n${noiseLib}\n`
      + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + body)
  }
  material.customProgramCacheKey = () => key // each layer has its own body: never share a cached program
  return material
}

// Droplets thrown out of the plunge on their own arcs (GPU only), never back into the rock.
const sprayVertex = `attribute vec4 aSeed; uniform float uTime; uniform float uWidth; uniform float uPixels; varying float vFade;
void main() {
  float life = 0.45 + 0.4 * aSeed.y, t = fract(uTime / life + aSeed.w) * life;
  float a = 3.14159 * (-0.42 + 0.84 * aSeed.x), out_ = 0.6 + 1.8 * aSeed.y * aSeed.y, up = 1.6 + 2.6 * aSeed.z;
  vec3 p = vec3(0.2, 0.0, (fract(aSeed.x * 37.1) - 0.5) * uWidth) + vec3(cos(a) * out_ * t, up * t - 4.9 * t * t, sin(a) * out_ * t);
  vFade = step(0.0, p.y) * (1.0 - smoothstep(0.6, 1.0, t / life));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(uPixels * (0.03 + 0.04 * aSeed.z) / max(-mv.z, 0.1), 24.0);
}`
const sprayFragment = `uniform float uLight; varying float vFade;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0 || vFade <= 0.0) discard;
  gl_FragColor = vec4(vec3(0.9, 0.95, 0.95) * uLight, (1.0 - smoothstep(0.35, 1.0, r)) * vFade * 0.8);
  #include <colorspace_fragment>
}`
// Mist puffs: soft round billboards drifting up and out from the plunge, dimmed with the light (unlit sprites would glow).
const mistVertex = `attribute vec4 aSeed; uniform float uTime; uniform float uPixels; varying float vAlpha;
void main() {
  float life = fract(uTime * 0.12 + aSeed.x);
  vec3 p = vec3(0.6 + life * 2.4 + aSeed.y, 0.3 + life * 4.5, (aSeed.z - 0.5) * 6.0);
  vAlpha = sin(3.14159 * life) * 0.13;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(uPixels * (1.6 + life * 3.0) / max(-mv.z, 0.1), 900.0);
}`
const mistFragment = `uniform float uLight; varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float soft = 1.0 - smoothstep(0.0, 1.0, r); // eased: a puff never shows a rim
  gl_FragColor = vec4(vec3(0.91, 0.95, 0.94) * uLight, soft * soft * vAlpha);
  #include <colorspace_fragment>
}`
// Churned white water spreading from the plunge; direction-vector sampling (no atan seam).
const foamFragment = `uniform float uTime; uniform float uLight; varying vec2 vLocal;
${noiseLib}
void main() {
  vec2 q = vLocal / 6.0; float r = length(q);
  vec2 dir = q / max(r, 1e-3) * smoothstep(0.0, 0.35, r);
  float churn = wfNoise(dir * 2.2 + vec2(r * 5.0 - uTime * 1.4)) * 0.55 + wfNoise(q * 7.0 + uTime * 0.6) * 0.25 + wfNoise(q * 16.0 - uTime * 0.9) * 0.2;
  float alpha = smoothstep(0.5, 0.82, churn + (1.0 - r) * 0.25) * (1.0 - smoothstep(0.1, 0.95, r)) * 0.75;
  gl_FragColor = vec4(vec3(0.93, 0.96, 0.95) * uLight, alpha);
  #include <colorspace_fragment>
}`
// Rainbow: a faint arc in the spray, spectrum across its width, only on bright afternoons.
const bowFragment = `uniform float uStrength; varying vec2 vUv;
void main() {
  vec2 c = vUv - vec2(0.5, 0.0); float r = length(c * vec2(1.0, 1.25));
  float band = (r - 0.36) / 0.08;
  if (band < 0.0 || band > 1.0) discard;
  vec3 spectrum = clamp(abs(fract(band * 0.85 + vec3(0.0, 0.67, 0.33)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  gl_FragColor = vec4(spectrum * sin(band * 3.1416) * smoothstep(0.0, 0.25, vUv.y) * uStrength, 1.0);
}`
const passVertex = 'varying vec2 vUv; varying vec2 vLocal; void main() { vUv = uv; vLocal = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'

function seeded(count: number) {
  const data = new Float32Array(count * 4)
  // A fixed hashed scatter, so every visit throws the same spray.
  for (let i = 0; i < data.length; i++) { const n = Math.sin(i * 12.9898 + 78.233) * 43758.5453; data[i] = n - Math.floor(n) }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3)) // positions come from the shader
  geometry.setAttribute('aSeed', new BufferAttribute(data, 4))
  return geometry
}

export function Waterfall() {
  const parts = useMemo(() => {
    const shared = { uWfTime: { value: 0 }, uWfGold: { value: new Color(0xffc56a) }, uWfGlow: { value: 0 } }
    const foot = new Vector3(footX(), WATER_LEVEL, WATERFALL.z)
    // The inner curtain nearer the rock is darker and slower, so the fall has depth face-on and from the side.
    const inner = { geometry: curtain(-0.2, 0.82), material: curtainMaterial('lumenwood-falls-inner', 0x87a39e, curtainBody(0.7, 0.72, 0, 0.6), shared) }
    // Base colour kept below white: lit by the full afternoon sun the curtain otherwise crosses the bloom threshold.
    const outer = { geometry: curtain(0, 1), material: curtainMaterial('lumenwood-falls-outer', 0xa9c3bd, curtainBody(1, 1, 1, 1), shared) }
    const light = { uLight: { value: 1 }, uTime: { value: 0 }, uPixels: { value: 900 } }
    const spray = { geometry: seeded(SPRAY), material: new ShaderMaterial({ uniforms: { ...light, uWidth: { value: WATERFALL.width * 0.75 } }, vertexShader: sprayVertex, fragmentShader: sprayFragment, transparent: true, depthWrite: false }) }
    const mist = { geometry: seeded(MIST), material: new ShaderMaterial({ uniforms: light, vertexShader: mistVertex, fragmentShader: mistFragment, transparent: true, depthWrite: false }) }
    const foam = { geometry: new RingGeometry(0.4, 6, 48, 6).rotateX(-Math.PI / 2), material: new ShaderMaterial({ uniforms: light, vertexShader: passVertex, fragmentShader: foamFragment, transparent: true, depthWrite: false }) }
    const bow = { geometry: new PlaneGeometry(13, 6).translate(0, 3, 0), material: new ShaderMaterial({ uniforms: { uStrength: { value: 0 } }, vertexShader: passVertex, fragmentShader: bowFragment, transparent: true, depthWrite: false, blending: AdditiveBlending }) }
    return { shared, light, foot, inner, outer, spray, mist, foam, bow }
  }, [])
  useEffect(() => () => {
    for (const p of [parts.inner, parts.outer, parts.spray, parts.mist, parts.foam, parts.bow]) { p.geometry.dispose(); (p.material as Material).dispose() }
  }, [parts])
  useFrame(({ clock, size, viewport }) => {
    const p = atmosphere.preset, t = clock.elapsedTime
    parts.shared.uWfTime.value = t; parts.shared.uWfGlow.value = secretFx.waterfallGlow
    // Sprites and droplets are unlit: they follow the light level (sun by day, moon at night) so they never glow.
    parts.light.uTime.value = t; parts.light.uPixels.value = size.height * viewport.dpr
    parts.light.uLight.value = 0.16 + 0.84 * Math.min(1, (p.sunIntensity * 0.18 + p.hemiIntensity * 0.25) / 1.1)
    // The rainbow needs a high bright sun: afternoons only.
    parts.bow.material.uniforms.uStrength.value = 0.14 * (1 - atmosphere.blend) * Math.min(1, p.sunIntensity / 4)
  })
  const { foot } = parts
  return <>
    <mesh geometry={parts.inner.geometry} material={parts.inner.material} renderOrder={2}/>
    <mesh geometry={parts.outer.geometry} material={parts.outer.material} renderOrder={3}/>
    <mesh geometry={parts.foam.geometry} material={parts.foam.material} position={[foot.x + 1, WATER_LEVEL + 0.02, foot.z]} renderOrder={4}/>
    <points geometry={parts.spray.geometry} material={parts.spray.material} position={foot} frustumCulled={false} renderOrder={5}/>
    <points geometry={parts.mist.geometry} material={parts.mist.material} position={foot} frustumCulled={false} renderOrder={6}/>
    {/* Facing east, toward the trail, where the afternoon sun is over the viewer's shoulder. */}
    <mesh geometry={parts.bow.geometry} material={parts.bow.material} position={[foot.x + 4, WATER_LEVEL, foot.z]} rotation={[0, Math.PI / 2, 0]} renderOrder={7}/>
  </>
}
