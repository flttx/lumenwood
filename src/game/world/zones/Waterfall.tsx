import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, MeshStandardMaterial, PlaneGeometry, ShaderMaterial, Vector3, type Material, type WebGLProgramParametersWithUniforms } from 'three'
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
const ROWS = 36, COLUMNS = 18, GRAVITY = 9.8, LIP_SPEED = 1.65, SPRAY = 320, MIST = 28
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
      const x = WATERFALL.x + LIP_SPEED * t * (1 - 0.25 * across * across) + 0.18 * (1 - across * across) + back
      positions.push(x, y, WATERFALL.z + across * half * (1 + 0.34 * v)); uvs.push(u, v)
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
  return mix(mix(wfHash(i), wfHash(i + vec2(1, 0)), f.x), mix(wfHash(i + vec2(0, 1)), wfHash(i + vec2(1, 1)), f.x), f.y); }
float wfFbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * wfNoise(p); p *= 2.05; a *= 0.5; } return v; }`
/** Water pattern for one curtain layer. `speed` slows the inner layer, `ropes` lets the outer one part, `shade` darkens. */
const curtainBody = (speed: number, opacity: number, ropes: number, shade: number) => `
  float t = uWfTime * ${speed.toFixed(2)};
  vec2 q = vWfUv; // u across, v = fall time (0 at the lip)
  float fall = q.y - t * 0.92;
  float across = q.x + (wfNoise(vec2(q.x * 8.5, fall * 4.2)) - 0.5) * 0.065;
  float streakA = wfNoise(vec2(across * 13.0, fall * 3.8));
  float streakB = wfNoise(vec2(across * 29.0 + 1.7, fall * 13.5));
  float streakC = wfNoise(vec2(across * 52.0 - 3.1, fall * 24.0));
  float streak = streakA * 0.52 + streakB * 0.33 + streakC * 0.15;
  float tongue = 1.0 - smoothstep(0.05, 0.3, q.y + (wfNoise(vec2(q.x * 8.0, t * 0.75)) - 0.5) * 0.09);
  float lipFoam = (1.0 - smoothstep(0.0, 0.11, q.y)) * smoothstep(0.32, 0.72, streakA * 0.7 + streakB * 0.3);
  float plungeFoam = smoothstep(0.62, 0.98, q.y) * (0.45 + 0.55 * smoothstep(0.3, 0.72, streak));
  float side = q.x < 0.5 ? 0.0 : 7.0;
  float edge = abs(q.x * 2.0 - 1.0) + (wfNoise(vec2(side, q.y * 5.0 - t * 2.4)) - 0.5) * 0.24;
  float foamMask = clamp(smoothstep(0.42, 0.76, streak) * 0.78 + plungeFoam * 0.55 + lipFoam * 0.5, 0.0, 1.0);
  vec3 aqua = vec3(0.16, 0.42, 0.46);
  vec3 foamCol = vec3(0.88, 0.94, 0.96);
  vec3 white = mix(aqua, foamCol, foamMask);
  vec3 glass = mix(vec3(0.18, 0.44, 0.48), vec3(0.76, 0.88, 0.9), smoothstep(0.42, 0.82, wfNoise(vec2(q.x * 7.5, q.y * 2.2 - t * 1.6))));
  float ropeField = wfNoise(vec2(across * 12.0, fall * 3.4)) * 0.68 + wfNoise(vec2(across * 28.0, fall * 7.2)) * 0.32;
  float rope = smoothstep(0.34, 0.6, ropeField), rim = 1.0 - smoothstep(0.0, 0.07, abs(ropeField - 0.47));
  float parted = ${ropes.toFixed(2)} * (1.0 - tongue) * smoothstep(0.1, 0.34, q.y);
  vec3 body = mix(white, glass, tongue * 0.82);
  body = mix(body, mix(vec3(0.15, 0.34, 0.38), body, 0.5), 1.0 - ${shade.toFixed(2)});
  diffuseColor.rgb = body * ${shade.toFixed(2)} * mix(1.0, 0.9 + 0.22 * rope + 0.18 * rim, parted);
  diffuseColor.rgb = mix(diffuseColor.rgb, uWfGold, uWfGlow * (0.35 + 0.55 * foamMask));
  diffuseColor.a = mix(0.28 + 0.62 * foamMask, 0.64, tongue) * (1.0 - smoothstep(0.68, 1.0, edge + (streak - 0.5) * 0.2))
    * mix(1.0, 0.08 + 0.92 * rope, parted) * ${opacity.toFixed(2)};
  float wfFoamGlow = foamMask * ${shade.toFixed(2)};`
const curtainEmissive = `#include <emissivemap_fragment>
  vec3 wfView = normalize(vViewPosition);
  float wfFresnel = pow(clamp(1.0 - abs(dot(normal, wfView)), 0.0, 1.0), 2.4);
  // Subtle water translucency & aerated foam catch sunlight/sky even when the cliff behind sits in tree shadow.
  totalEmissiveRadiance += uWfLightCol * (wfFoamGlow * 0.26 + wfFresnel * 0.28) * (0.35 + 0.65 * uWfDay);
  totalEmissiveRadiance += vec3(0.45, 0.64, 0.88) * uWfNight * (wfFoamGlow * 0.28 + wfFresnel * 0.16);
  totalEmissiveRadiance += uWfGold * uWfGlow * (0.18 + 0.32 * wfFoamGlow);`

function curtainMaterial(key: string, color: number, roughness: number, body: string, shared: Record<string, { value: unknown }>) {
  const material = new MeshStandardMaterial({ color, roughness, metalness: 0.04, transparent: true, depthWrite: false, side: DoubleSide })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, shared)
    shader.vertexShader = 'uniform float uWfTime; varying vec2 vWfUv;\n' + shader.vertexShader
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvWfUv = uv;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  float wfSurge = sin(uv.y * 14.0 - uWfTime * 5.2 + uv.x * 7.0) * 0.065 + sin(uv.y * 27.0 - uWfTime * 8.4 - uv.x * 13.0) * 0.028;
  transformed.x += wfSurge * smoothstep(0.05, 0.25, uv.y) * (1.0 - abs(uv.x * 2.0 - 1.0) * 0.6);`)
    shader.fragmentShader = `uniform float uWfTime; uniform vec3 uWfGold; uniform float uWfGlow; uniform float uWfNight; uniform vec3 uWfLightCol; uniform float uWfDay; varying vec2 vWfUv;\n${noiseLib}\n`
      + shader.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + body)
        .replace('#include <emissivemap_fragment>', curtainEmissive)
  }
  material.customProgramCacheKey = () => key // each layer has its own body: never share a cached program
  return material
}

// Droplets thrown out of the plunge on their own arcs (GPU only), never back into the rock.
const sprayVertex = `attribute vec4 aSeed; uniform float uTime; uniform float uWidth; uniform float uPixels; varying float vFade;
void main() {
  float life = 0.45 + 0.45 * aSeed.y, t = fract(uTime / life + aSeed.w) * life;
  float a = 3.14159 * (-0.42 + 0.84 * aSeed.x), out_ = 0.65 + 2.1 * aSeed.y * aSeed.y, up = 1.7 + 2.9 * aSeed.z;
  vec3 p = vec3(0.25, 0.0, (fract(aSeed.x * 37.1) - 0.5) * uWidth) + vec3(cos(a) * out_ * t, up * t - 4.9 * t * t, sin(a) * out_ * t);
  vFade = step(0.0, p.y) * (1.0 - smoothstep(0.58, 1.0, t / life));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(uPixels * (0.028 + 0.042 * aSeed.z) / max(-mv.z, 0.1), 24.0);
}`
const sprayFragment = `uniform vec3 uLightCol; varying float vFade;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0 || vFade <= 0.0) discard;
  gl_FragColor = vec4(uLightCol * 1.05, (1.0 - smoothstep(0.28, 1.0, r)) * vFade * 0.85);
  #include <colorspace_fragment>
}`
// Billowing mist puffs: FBM-textured soft clouds rising and swirling outward from the plunge pool.
const mistVertex = `attribute vec4 aSeed; uniform float uTime; uniform float uPixels; varying float vAlpha; varying float vSeed; varying float vLife;
void main() {
  float life = fract(uTime * (0.09 + 0.05 * aSeed.w) + aSeed.x);
  float spread = (aSeed.z - 0.5) * (6.2 + life * 3.4);
  vec3 p = vec3(0.4 + life * 3.6 + (aSeed.y - 0.5) * 2.2, 0.2 + life * 4.8, spread);
  vAlpha = sin(3.14159 * life) * (1.0 - 0.35 * life) * 0.14;
  vSeed = aSeed.x * 19.7 + aSeed.y * 7.3;
  vLife = life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(uPixels * (1.9 + life * 3.8) / max(-mv.z, 0.25), 340.0);
}`
const mistFragment = `uniform vec3 uLightCol; uniform float uTime; varying float vAlpha; varying float vSeed; varying float vLife;
${noiseLib}
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;
  float ang = vSeed + vLife * 0.85;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  float n = wfFbm(rot * uv * 3.4 + vec2(vSeed, -uTime * 0.25));
  float soft = pow(max(0.0, 1.0 - r), 1.65) * smoothstep(0.24, 0.78, n + (1.0 - r) * 0.35);
  gl_FragColor = vec4(uLightCol, soft * vAlpha);
  #include <colorspace_fragment>
}`
// Churned white water spreading from the plunge; direction-vector sampling (no atan seam).
const foamFragment = `uniform float uTime; uniform vec3 uLightCol; uniform float uNight; varying vec2 vLocal;
${noiseLib}
void main() {
  vec2 q = vLocal / 6.8; float r = length(q);
  vec2 dir = q / max(r, 1e-3) * smoothstep(0.0, 0.32, r);
  float ring = 0.5 + 0.5 * sin(r * 16.0 - uTime * 3.2 + wfNoise(q * 4.5) * 3.0);
  float churn = wfNoise(dir * 2.4 + vec2(r * 5.2 - uTime * 1.65)) * 0.5 + wfNoise(q * 7.5 + uTime * 0.7) * 0.3 + wfNoise(q * 18.0 - uTime * 1.1) * 0.2;
  float core = (1.0 - smoothstep(0.0, 0.38, r)) * 0.55;
  float alpha = (smoothstep(0.44, 0.8, churn + (1.0 - r) * 0.28 + ring * 0.12) + core) * (1.0 - smoothstep(0.15, 0.96, r)) * 0.82;
  vec3 tint = mix(uLightCol * 1.05, vec3(0.76, 0.88, 1.0) * 0.75, uNight * 0.45);
  gl_FragColor = vec4(tint, clamp(alpha, 0.0, 0.88));
  #include <colorspace_fragment>
}`
// Rainbow: delicate, feathered mist arc that fades smoothly at grazing viewing angles so it never reads as a flat card.
const bowVertex = `varying vec2 vUv; varying vec3 vWorld; varying vec3 vWorldNormal;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`
const bowFragment = `uniform float uStrength; varying vec2 vUv; varying vec3 vWorld; varying vec3 vWorldNormal;
void main() {
  vec2 c = vUv - vec2(0.5, 0.0); float r = length(c * vec2(1.0, 1.25));
  float band = (r - 0.35) / 0.11;
  if (band < 0.0 || band > 1.0) discard;
  vec3 spectrum = clamp(abs(fract(band * 0.82 + vec3(0.0, 0.67, 0.33)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  spectrum = mix(vec3(0.78), spectrum, 0.62); // softer atmospheric pastel dispersion
  float viewFade = smoothstep(0.28, 0.75, abs(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorld))));
  float arcFade = pow(sin(band * 3.14159), 1.8) * smoothstep(0.05, 0.34, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
  gl_FragColor = vec4(spectrum * arcFade * viewFade * uStrength, 1.0);
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
    const shared = { uWfTime: { value: 0 }, uWfGold: { value: new Color(0xffc56a) }, uWfGlow: { value: 0 }, uWfNight: { value: 0 }, uWfLightCol: { value: new Color(0xe8f4f6) }, uWfDay: { value: 1 } }
    const foot = new Vector3(footX(), WATER_LEVEL, WATERFALL.z)
    // Deeper parallax separation between inner translucent body and outer frothy ropes gives real thickness from side views.
    const inner = { geometry: curtain(-0.46, 0.84), material: curtainMaterial('lumenwood-falls-inner-v2', 0xa2c8cb, 0.22, curtainBody(0.72, 0.82, 0, 0.72), shared) }
    const outer = { geometry: curtain(0.06, 1.02), material: curtainMaterial('lumenwood-falls-outer-v2', 0xd8ecee, 0.14, curtainBody(1.04, 0.96, 1, 1), shared) }
    const light = { uLightCol: { value: new Color(0xe8f4f6) }, uTime: { value: 0 }, uPixels: { value: 900 }, uNight: { value: 0 } }
    const spray = { geometry: seeded(SPRAY), material: new ShaderMaterial({ uniforms: { ...light, uWidth: { value: WATERFALL.width * 0.82 } }, vertexShader: sprayVertex, fragmentShader: sprayFragment, transparent: true, depthWrite: false }) }
    const mist = { geometry: seeded(MIST), material: new ShaderMaterial({ uniforms: light, vertexShader: mistVertex, fragmentShader: mistFragment, transparent: true, depthWrite: false }) }
    const foam = { geometry: new CircleGeometry(6.8, 48).rotateX(-Math.PI / 2), material: new ShaderMaterial({ uniforms: light, vertexShader: passVertex, fragmentShader: foamFragment, transparent: true, depthWrite: false }) }
    const bow = { geometry: new PlaneGeometry(13, 6).translate(0, 3, 0), material: new ShaderMaterial({ uniforms: { uStrength: { value: 0 } }, vertexShader: bowVertex, fragmentShader: bowFragment, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }) }
    return { shared, light, foot, inner, outer, spray, mist, foam, bow, sunTmp: new Color(), skyTmp: new Color() }
  }, [])
  useEffect(() => () => {
    for (const p of [parts.inner, parts.outer, parts.spray, parts.mist, parts.foam, parts.bow]) { p.geometry.dispose(); (p.material as Material).dispose() }
  }, [parts])
  useFrame(({ clock, size, viewport }) => {
    const p = atmosphere.preset, t = clock.elapsedTime
    parts.shared.uWfTime.value = t; parts.shared.uWfGlow.value = secretFx.waterfallGlow; parts.shared.uWfNight.value = atmosphere.night
    parts.shared.uWfDay.value = 1 - atmosphere.blend
    // Sprites, droplets, and translucent glow follow live sun + sky colour so mist stays luminous by day and softly moonlit at night.
    const level = 0.22 + 0.78 * Math.min(1, (p.sunIntensity * 0.18 + p.hemiIntensity * 0.28) / 1.05)
    parts.sunTmp.setHex(p.sun); parts.skyTmp.setHex(p.hemiSky)
    parts.light.uLightCol.value.copy(parts.skyTmp).lerp(parts.sunTmp, 0.55 * (1 - atmosphere.night)).multiplyScalar(level)
    parts.shared.uWfLightCol.value.copy(parts.light.uLightCol.value)
    parts.light.uTime.value = t; parts.light.uPixels.value = size.height * viewport.dpr; parts.light.uNight.value = atmosphere.night
    // Delicate rainbow mist arc only on bright afternoons.
    parts.bow.material.uniforms.uStrength.value = 0.085 * (1 - atmosphere.blend) * Math.min(1, p.sunIntensity / 4)
  })
  const { foot } = parts
  return <>
    <mesh geometry={parts.inner.geometry} material={parts.inner.material} renderOrder={2}/>
    <mesh geometry={parts.outer.geometry} material={parts.outer.material} renderOrder={3}/>
    <mesh geometry={parts.foam.geometry} material={parts.foam.material} position={[foot.x + 1, WATER_LEVEL + 0.02, foot.z]} renderOrder={4}/>
    <points geometry={parts.spray.geometry} material={parts.spray.material} position={foot} frustumCulled={false} renderOrder={5}/>
    <points geometry={parts.mist.geometry} material={parts.mist.material} position={foot} frustumCulled={false} renderOrder={6}/>
    {/* Facing east, toward the trail, where the afternoon sun is over the viewer's shoulder. */}
    <mesh geometry={parts.bow.geometry} material={parts.bow.material} position={[foot.x + 3.6, WATER_LEVEL + 0.1, foot.z]} rotation={[0, Math.PI / 2, 0]} renderOrder={7}/>
  </>
}
