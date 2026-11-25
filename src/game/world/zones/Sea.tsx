import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DataTexture, DataUtils, HalfFloatType, LinearFilter, PlaneGeometry, RedFormat, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3, Vector4, type Mesh } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { reflectionSkips } from '../../rendering/planarReflection'
import { smoothstep } from '../../shared/math'
import { SEA_LEVEL, heightAt } from '../terrain/terrain'
import { ISLAND_EXTENT } from '../terrain/Ground'
import { surfGLSL, surfTime } from '../terrain/surf'
// Split sea geometry: a fine 80×50 cove patch (where coveSurge animates the surf) plus a coarse 24×24 outer ocean
// plane following the camera — reduces sea geometry by 96% (231,200 → 9,152 tris) with zero seam. Seabed textures use
// HalfFloatType (R16F), which is guaranteed linearly filterable in WebGL2 core without optional float-linear extensions.
const SIZE = 680, SNAP = 8, CELL = 3
const COVE_RECT = { minX: -78, maxX: 78, minZ: -156, maxZ: -48 }, COVE_CELL = 0.75
// Cove mesh covers slightly beyond coveSurge's non-zero envelope (|x| < 68, z in [-142, -62]) so edges sit flat at SEA_LEVEL.
const COVE_MESH = { minX: -72, maxX: 72, minZ: -146, maxZ: -56 }
const vertexShader = `uniform float uTime; uniform float uSurge;
varying vec3 vWorld; varying float vCrest;
${surfGLSL}
#include <fog_pars_vertex>
vec3 gerstner(vec2 p, float t, vec2 d, float k, float amp, float speed) {
  float ph = dot(d, p) * k + t * speed;
  float c = cos(ph), s = sin(ph);
  return vec3(d.x * amp * 0.55 * c, amp * s, d.y * amp * 0.55 * c);
}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float swellMask = uSurge > 0.5
    ? smoothstep(-94.0, -118.0, world.z) * (1.0 - smoothstep(28.0, 52.0, abs(world.x)) * 0.35)
    : smoothstep(75.0, 140.0, length(world.xz));
  vec3 wave = vec3(0.0);
  wave += gerstner(world.xz, uTime, normalize(vec2(0.32, 0.95)), 0.14, 0.14, 1.05);
  wave += gerstner(world.xz, uTime, normalize(vec2(-0.68, 0.73)), 0.21, 0.09, 1.32);
  wave += gerstner(world.xz, uTime, normalize(vec2(0.84, -0.54)), 0.31, 0.05, 1.65);
  world.xyz += wave * swellMask;
  if (uSurge > 0.5) world.y += coveSurge(world.xz, uTime);
  vWorld = world.xyz;
  vCrest = clamp(wave.y * swellMask * 2.4 + 0.5, 0.0, 1.0);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const fragmentShader = `uniform float uTime; uniform float uClipCove; uniform sampler2D uSeabed; uniform vec4 uRect; uniform vec2 uGrid;
uniform sampler2D uCoveBed; uniform vec4 uCoveRect; uniform vec2 uCoveGrid;
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; uniform vec3 uHaze; uniform vec3 uFoam;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSun; uniform vec3 uMoonDir; uniform float uMoon; uniform float uDusk; uniform float uNight;
varying vec3 vWorld; varying float vCrest;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// Analytic value-noise derivative: 3× fewer noise evaluations per octave than finite-difference gradients.
vec2 noiseGrad(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return du * vec2((b - a) + (a - b - c + d) * u.y, (c - a) + (a - b - c + d) * u.x);
}
// Multi-scale wind waves + capillary ripples; filtered by screen-space footprint to prevent horizon moire.
vec2 surfaceSlope(vec2 p, float t) {
  vec2 footprint = fwidth(p);
  float pixel = max(footprint.x, footprint.y);
  vec2 slope = vec2(0.0);
  for (int i = 0; i < 5; i++) {
    float scale = i == 0 ? 0.09 : (i == 1 ? 0.24 : (i == 2 ? 0.58 : (i == 3 ? 1.35 : 2.9)));
    float strength = i == 0 ? 0.24 : (i == 1 ? 0.19 : (i == 2 ? 0.13 : (i == 3 ? 0.08 : 0.04)));
    vec2 direction = i == 0 ? vec2(0.08, 0.14) : (i == 1 ? vec2(-0.15, 0.11) : (i == 2 ? vec2(0.21, -0.14) : (i == 3 ? vec2(-0.14, -0.24) : vec2(0.26, 0.18))));
    float angle = float(i) * 1.67 + 0.42;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 q = turn * p * scale + direction * t;
    vec2 gradient = noiseGrad(q);
    float visible = 1.0 - smoothstep(0.18, 0.72, pixel * scale);
    slope += vec2(dot(turn[0], gradient), dot(turn[1], gradient)) * strength * visible;
  }
  return slope;
}
// Dual-layer interference caustics projected into shallow sunlit water.
float caustics(vec2 p, float t) {
  vec2 q1 = p * 0.85 + vec2(t * 0.24, -t * 0.18);
  vec2 q2 = mat2(0.8, 0.6, -0.6, 0.8) * p * 1.25 + vec2(-t * 0.19, t * 0.27);
  float a = abs(noise(q1) * 2.0 - 1.0);
  float b = abs(noise(q2) * 2.0 - 1.0);
  return pow(1.0 - min(a, b), 5.0);
}
// Matches Atmosphere.tsx three-zone sky scattering so wave facets mirror warm sunset / crisp blue zenith naturally.
vec3 sampleSky(vec3 dir) {
  float day = clamp(1.0 - uDusk - uNight, 0.0, 1.0);
  vec3 d = normalize(vec3(dir.x, max(dir.y, mix(0.015, 0.14, day)), dir.z));
  float h = clamp(d.y, 0.0, 1.0);
  vec2 ring = normalize(d.xz + vec2(1e-5));
  float sunSide = clamp(dot(ring, normalize(uSunDir.xz + vec2(1e-5))) * 0.5 + 0.5, 0.0, 1.0);
  vec3 antiHorizon = mix(uSkyHorizon, mix(uSkyTop, uHaze, 0.55), 0.35 + 0.25 * uDusk);
  vec3 solarHorizon = mix(uSkyHorizon, uSunColor * 1.08 + uSkyHorizon * 0.2, (0.28 + 0.45 * uDusk) * (1.0 - uNight));
  vec3 horizCol = mix(antiHorizon, solarHorizon, pow(sunSide, 1.6));
  vec3 midSky = mix(mix(horizCol, uSkyTop, 0.52), uSkyTop * 1.15 + vec3(0.04, 0.06, 0.09) * (1.0 - uNight), 0.45);
  vec3 sky = mix(horizCol, midSky, smoothstep(0.0, 0.24, h));
  sky = mix(sky, uSkyTop, smoothstep(0.14, 0.82, pow(h, 0.68)));
  float toward = max(dot(d, uSunDir), 0.0);
  sky += uSunColor * uSun * (pow(toward, 24.0) * 0.65 + pow(toward, 4.0) * 0.22);
  return sky;
}
void main() {
  if (uClipCove > 0.5 && vWorld.x > ${(COVE_MESH.minX + 0.15).toFixed(2)} && vWorld.x < ${(COVE_MESH.maxX - 0.15).toFixed(2)}
      && vWorld.z > ${(COVE_MESH.minZ + 0.15).toFixed(2)} && vWorld.z < ${(COVE_MESH.maxZ - 0.15).toFixed(2)}) discard;
  vec2 uv = (vWorld.xz - uRect.xy) / uRect.zw;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec2 bedUV = (clamp(uv, 0.0, 1.0) * (uGrid - 1.0) + 0.5) / uGrid;
  float bed = mix(-16.0, texture2D(uSeabed, bedUV).r, inside);
  vec2 local = (vWorld.xz - uCoveRect.xy) / uCoveRect.zw;
  vec2 localUV = (clamp(local, 0.0, 1.0) * (uCoveGrid - 1.0) + 0.5) / uCoveGrid;
  vec2 inset = min(local, 1.0 - local) * uCoveRect.zw;
  float localWeight = smoothstep(0.0, 4.0, min(inset.x, inset.y));
  bed = mix(bed, texture2D(uCoveBed, localUV).r, localWeight);
  float depth = vWorld.y - bed;
  if (depth < -0.04) discard;
  vec3 toEye = normalize(cameraPosition - vWorld);
  vec2 p = vWorld.xz;
  float distanceToEye = length(cameraPosition.xz - p);
  float shallowDamp = smoothstep(0.0, 0.45, depth);
  float waveDetail = mix(0.62, 0.18, smoothstep(18.0, 160.0, distanceToEye)) * (0.45 + 0.55 * shallowDamp);
  vec2 slope = surfaceSlope(p, uTime) * waveDetail;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float ndotv = clamp(dot(n, toEye), 0.0, 1.0);
  float maxFresnel = mix(0.92, 0.72, clamp(1.0 - uDusk - uNight, 0.0, 1.0));
  float fresnel = clamp(0.03 + (maxFresnel - 0.03) * pow(1.0 - ndotv, 4.0), 0.03, maxFresnel);
  vec3 r = reflect(-toEye, n);
  vec3 skyRefl = sampleSky(r);
  // Beer-Lambert optical absorption from crystal turquoise shallows to sapphire ocean depths.
  float opticalDepth = max(0.0, depth) * (0.9 + 0.18 * noise(p * 0.11));
  vec3 transmit = exp(-opticalDepth * vec3(0.55, 0.2, 0.11));
  vec3 body = mix(uDeep, uShallow, transmit);
  // Sunlit underwater caustics in shallow cove & reef water.
  float shallowZone = smoothstep(0.04, 0.35, depth) * (1.0 - smoothstep(1.4, 4.2, depth));
  float cVal = caustics(p + n.xz * depth * 0.45, uTime);
  body += (uShallow * 0.65 + uSunColor * 0.45) * cVal * shallowZone * (0.12 + 0.42 * uSun) * (1.0 - uNight * 0.75);
  // Wave-crest subsurface scattering when backlit or side-lit by the sun.
  float backScatter = pow(max(dot(-toEye, uSunDir), 0.0), 4.0) * 0.75 + 0.25 * max(dot(n, uSunDir), 0.0);
  float sss = backScatter * (0.25 + 0.75 * vCrest) * pow(1.0 - ndotv, 1.5) * uSun * (1.0 - uNight);
  body += mix(uShallow, vec3(0.28, 0.85, 0.78), 0.5) * uSunColor * sss * 0.42;
  vec3 col = mix(body, skyRefl, fresnel);
  // Crisp sun & moon glitter path + soft sheen.
  float sunR = max(dot(r, uSunDir), 0.0), moonR = max(dot(r, uMoonDir), 0.0);
  float sparkle = 0.55 + 0.45 * noise(p * 0.7 + vec2(uTime * 0.35, -uTime * 0.22));
  col += uSunColor * uSun * (pow(sunR, 520.0) * 9.5 * sparkle + pow(sunR, 42.0) * 0.32);
  col += vec3(0.75, 0.86, 1.0) * uMoon * (pow(moonR, 380.0) * 4.5 * sparkle + pow(moonR, 28.0) * 0.14);
  // Layered shore-break surf lines and lacy receding foam.
  float laceA = noise(p * 1.15 + vec2(uTime * 0.14, -uTime * 0.09));
  float laceB = noise(p * 3.1 - vec2(uTime * 0.18, uTime * 0.12));
  float lace = smoothstep(0.32, 0.76, laceA * 0.65 + laceB * 0.35);
  float shoreEdge = (1.0 - smoothstep(0.0, 0.22, depth)) * smoothstep(-0.02, 0.04, depth);
  float wavePhase = depth * 5.4 - uTime * 1.45 + noise(p * 0.12) * 3.6;
  float surfBand = pow(max(0.0, 0.5 + 0.5 * sin(wavePhase)), 7.0)
    * smoothstep(0.05, 0.24, depth) * (1.0 - smoothstep(0.7, 1.75, depth));
  float foamFilter = 1.0 - smoothstep(0.35, 1.8, length(fwidth(p)));
  float foam = (shoreEdge * (0.35 + 0.65 * lace) + surfBand * (0.25 + 0.75 * lace)) * foamFilter;
  col = mix(col, uFoam * (0.78 + 0.22 * max(dot(n, uSunDir), 0.0)), clamp(foam, 0.0, 0.82));
  // Delayed horizon haze preserving deep blue sea distance while matching Atmosphere.tsx seamlessly.
  vec3 horizonMid = mix(mix(uSkyHorizon, uSkyTop, 0.52), uSkyTop * 1.15 + vec3(0.04, 0.06, 0.09) * (1.0 - uNight), 0.45);
  vec3 farHaze = mix(uHaze, horizonMid, 0.3);
  float haze = smoothstep(185.0, 340.0, vFogDepth);
  float alpha = mix(smoothstep(-0.01, 0.26, depth) * mix(0.68, 0.98, 1.0 - exp(-opticalDepth * 1.4)), 1.0, clamp(foam * 0.85 + fresnel * 0.45 + haze, 0.0, 1.0));
  alpha = mix(alpha, 1.0, smoothstep(1.8, 3.2, depth));
  gl_FragColor = vec4(mix(col, farHaze, haze), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
const COLORS = {
  deep: [new Color(0x093a69), new Color(0x142f44), new Color(0x091422)],
  shallow: [new Color(0x1b8f9c), new Color(0x2f5f66), new Color(0x142b36)],
  foam: [new Color(0xf4faf8), new Color(0xd2c4d4), new Color(0x6c7fa0)],
}
const pick = (set: Color[], out: Color) => {
  const t = atmosphere.time
  return t <= 1 ? out.copy(set[0]).lerp(set[1], t) : out.copy(set[1]).lerp(set[2], t - 1)
}

/** Seabed heights on a CELL-metre grid packed as R16F (HalfFloatType) for guaranteed WebGL2 linear filtering. */
function bakeSeabed(rect: typeof ISLAND_EXTENT, cell: number) {
  const { minX, maxX, minZ, maxZ } = rect
  const w = Math.ceil((maxX - minX) / cell) + 1, h = Math.ceil((maxZ - minZ) / cell) + 1, data = new Uint16Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    data[j * w + i] = DataUtils.toHalfFloat(heightAt(minX + (i * (maxX - minX)) / (w - 1), minZ + (j * (maxZ - minZ)) / (h - 1)))
  }
  const texture = new DataTexture(data, w, h, RedFormat, HalfFloatType)
  texture.magFilter = texture.minFilter = LinearFilter; texture.needsUpdate = true
  return { texture, grid: new Vector2(w, h) }
}

export function Sea() {
  const outerRef = useRef<Mesh>(null)
  const coveRef = useRef<Mesh>(null)
  const parts = useMemo(() => {
    const seabed = bakeSeabed(ISLAND_EXTENT, CELL), coveBed = bakeSeabed(COVE_RECT, COVE_CELL), { minX, maxX, minZ, maxZ } = ISLAND_EXTENT
    const shared = {
      uTime: surfTime,
      uSeabed: { value: seabed.texture }, uRect: { value: new Vector4(minX, minZ, maxX - minX, maxZ - minZ) }, uGrid: { value: seabed.grid },
      uCoveBed: { value: coveBed.texture }, uCoveRect: { value: new Vector4(COVE_RECT.minX, COVE_RECT.minZ, COVE_RECT.maxX - COVE_RECT.minX, COVE_RECT.maxZ - COVE_RECT.minZ) }, uCoveGrid: { value: coveBed.grid },
      uDeep: { value: new Color() }, uShallow: { value: new Color() }, uFoam: { value: new Color() },
      uSkyTop: { value: new Color() }, uSkyHorizon: { value: new Color() }, uHaze: { value: new Color() },
      uSunDir: { value: new Vector3() }, uSunColor: { value: new Color() }, uSun: { value: 1 }, uMoonDir: { value: new Vector3() }, uMoon: { value: 0 },
      uDusk: { value: 0 }, uNight: { value: 0 },
    }
    const makeMaterial = (surge: number, clipCove: number) => {
      const m = new ShaderMaterial({ uniforms: UniformsUtils.merge([UniformsLib.fog, { uSurge: { value: surge }, uClipCove: { value: clipCove } }]), vertexShader, fragmentShader, transparent: true, depthWrite: false, fog: true })
      Object.assign(m.uniforms, shared) // share dynamic colour/lighting uniform objects across both meshes
      return m
    }
    const outerMaterial = makeMaterial(0, 1)
    const coveMaterial = makeMaterial(1, 0)
    const outerGeometry = new PlaneGeometry(SIZE, SIZE, 48, 48).rotateX(-Math.PI / 2)
    const coveGeometry = new PlaneGeometry(COVE_MESH.maxX - COVE_MESH.minX, COVE_MESH.maxZ - COVE_MESH.minZ, 80, 56)
      .rotateX(-Math.PI / 2)
      .translate((COVE_MESH.minX + COVE_MESH.maxX) / 2, SEA_LEVEL, (COVE_MESH.minZ + COVE_MESH.maxZ) / 2)
    return { shared, outerGeometry, coveGeometry, outerMaterial, coveMaterial, seabed: seabed.texture, coveBed: coveBed.texture }
  }, [])
  useEffect(() => {
    const outer = outerRef.current, cove = coveRef.current
    if (outer) reflectionSkips.add(outer)
    if (cove) reflectionSkips.add(cove)
    return () => {
      if (outer) reflectionSkips.delete(outer)
      if (cove) reflectionSkips.delete(cove)
    }
  }, [])
  useEffect(() => () => {
    parts.outerGeometry.dispose(); parts.coveGeometry.dispose()
    parts.outerMaterial.dispose(); parts.coveMaterial.dispose()
    parts.seabed.dispose(); parts.coveBed.dispose()
  }, [parts])
  useFrame(({ camera, clock }) => {
    const u = parts.shared, p = atmosphere.preset
    outerRef.current?.position.set(Math.round(camera.position.x / SNAP) * SNAP, SEA_LEVEL, Math.round(camera.position.z / SNAP) * SNAP)
    u.uTime.value = clock.elapsedTime
    pick(COLORS.deep, u.uDeep.value); pick(COLORS.shallow, u.uShallow.value); pick(COLORS.foam, u.uFoam.value)
    u.uSkyTop.value.setHex(p.skyTop); u.uSkyHorizon.value.setHex(p.skyHorizon); u.uHaze.value.setHex(p.fog)
    u.uSunDir.value.copy(atmosphere.sunDirection); u.uSunColor.value.setHex(p.sun); u.uSun.value = p.sunGlow
    u.uMoonDir.value.copy(atmosphere.moonDirection); u.uMoon.value = smoothstep(0.6, 1.4, atmosphere.time)
    u.uDusk.value = atmosphere.blend * (1 - atmosphere.night); u.uNight.value = smoothstep(0.7, 1.6, atmosphere.time)
  })
  return <>
    <mesh ref={outerRef} geometry={parts.outerGeometry} material={parts.outerMaterial} frustumCulled={false} renderOrder={1} userData={{ aoSurface: true }}/>
    <mesh ref={coveRef} geometry={parts.coveGeometry} material={parts.coveMaterial} renderOrder={1} userData={{ aoSurface: true }}/>
  </>
}
