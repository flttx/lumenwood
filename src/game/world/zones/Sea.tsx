import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DataTexture, FloatType, LinearFilter, PlaneGeometry, RedFormat, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3, Vector4, type Mesh } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { SEA_LEVEL, heightAt } from '../terrain/terrain'
import { ISLAND_EXTENT } from '../terrain/Ground'
import { surfGLSL, surfTime } from '../terrain/surf'
// The sea around the island (third pass, 2026-11-12; the user: the forest should be an island in the sea). One large plane
// at SEA_LEVEL follows the camera out to the far plane; the fog carries it into the horizon haze. Code-only shading:
// - colour by depth from a baked seabed map: turquoise shallows over the sand, deep blue further out;
// - small travelling waves give the normal; the sky's colours are reflected with a fresnel blend;
// - a glitter path toward the sun by day and the moon by night;
// - surf: foam lines that roll in toward the beaches and wash along the sea cliff.
const SIZE = 680, SNAP = 8, CELL = 3
const COVE_RECT = { minX: -62, maxX: 62, minZ: -140, maxZ: -48 }, COVE_CELL = 0.75
const vertexShader = `uniform float uTime;
varying vec3 vWorld;
${surfGLSL}
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  world.y += coveSurge(world.xz, uTime);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const fragmentShader = `uniform float uTime; uniform sampler2D uSeabed; uniform vec4 uRect; uniform vec2 uGrid;
uniform sampler2D uCoveBed; uniform vec4 uCoveRect; uniform vec2 uCoveGrid;
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; uniform vec3 uFoam;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSun; uniform vec3 uMoonDir; uniform float uMoon;
varying vec3 vWorld;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// Multi-scale moving surface. Filter details smaller than a pixel to prevent horizon moire.
vec2 surfaceSlope(vec2 p, float t) {
  vec2 footprint = fwidth(p);
  float pixel = max(footprint.x, footprint.y);
  vec2 slope = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    float scale = i == 0 ? 0.08 : (i == 1 ? 0.32 : (i == 2 ? 0.85 : 1.8));
    float strength = i == 0 ? 0.18 : (i == 1 ? 0.14 : (i == 2 ? 0.08 : 0.035));
    vec2 direction = i == 0 ? vec2(0.07, 0.05) : (i == 1 ? vec2(-0.12, 0.08) : (i == 2 ? vec2(0.16, -0.10) : vec2(-0.09, -0.18)));
    float angle = float(i) * 1.73 + 0.37;
    mat2 turn = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 q = turn * p * scale + direction * t;
    float h = noise(q);
    vec2 gradient = vec2(noise(q + vec2(0.035, 0.0)) - h, noise(q + vec2(0.0, 0.035)) - h) / 0.035;
    float visible = 1.0 - smoothstep(0.2, 0.8, pixel * scale);
    slope += vec2(dot(turn[0], gradient), dot(turn[1], gradient)) * strength * visible;
  }
  return slope;
}
void main() {
  vec2 uv = (vWorld.xz - uRect.xy) / uRect.zw;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec2 bedUV = (clamp(uv, 0.0, 1.0) * (uGrid - 1.0) + 0.5) / uGrid;
  float bed = mix(-16.0, texture2D(uSeabed, bedUV).r, inside);
  vec2 local = (vWorld.xz - uCoveRect.xy) / uCoveRect.zw;
  vec2 localUV = (clamp(local, 0.0, 1.0) * (uCoveGrid - 1.0) + 0.5) / uCoveGrid;
  vec2 inset = min(local, 1.0 - local) * uCoveRect.zw;
  float localWeight = smoothstep(0.0, 4.0, min(inset.x, inset.y));
  bed = mix(bed, texture2D(uCoveBed, localUV).r, localWeight);
  // Let the terrain depth buffer define the shoreline; a sampled height is too coarse to clip it precisely.
  float depth = vWorld.y - bed;
  vec3 toEye = normalize(cameraPosition - vWorld);
  vec2 p = vWorld.xz;
  // Distant wave facets blend into a rough reflection instead of resolving as long horizontal bands.
  float distanceToEye = length(cameraPosition.xz - p);
  float waveDetail = mix(0.38, 0.045, smoothstep(12.0, 85.0, distanceToEye));
  vec2 slope = surfaceSlope(p, uTime) * waveDetail;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  // Integrate the broad sky reflection over a rough surface. Perturbed normals still drive the tiny glints below,
  // but must not swing a whole patch between orange horizon and blue zenith at a grazing view.
  float cosV = clamp(toEye.y, 0.0, 1.0);
  float fresnel = 0.04 + 0.3 * pow(1.0 - cosV, 5.0);
  vec3 r = reflect(-toEye, n);
  // A continuous sky gradient keeps the warm horizon without colouring the entire sea like the sunset.
  vec3 sky = mix(uSkyHorizon, uSkyTop, 0.62 + 0.22 * smoothstep(0.0, 0.8, cosV));
  // Continuous depth absorption with a small seabed variation, rather than a broad, uniform turquoise contour band.
  float opticalDepth = max(0.0, depth) * (0.9 + 0.2 * noise(p * 0.12));
  vec3 body = mix(uShallow, uDeep, 1.0 - exp(-opticalDepth * 0.24));
  vec3 col = mix(body, sky, fresnel) * (1.0 + dot(slope, vec2(0.6, 0.8)) * 0.16);
  // Glitter path: sharp sparkles plus a broad sheen toward the sun (or moon).
  float sunR = max(dot(r, uSunDir), 0.0), moonR = max(dot(r, uMoonDir), 0.0);
  float sparkle = noise(vWorld.xz * 0.45 + uTime * 0.2);
  col += uSunColor * uSun * (pow(sunR, 320.0) * 6.0 * (0.4 + sparkle) + pow(sunR, 24.0) * 0.18);
  col += vec3(0.75, 0.82, 1.0) * uMoon * (pow(moonR, 260.0) * 3.0 * (0.4 + sparkle) + pow(moonR, 18.0) * 0.1);
  // The broken crest follows the advancing intersection with the actual shallow seabed.
  float broken = smoothstep(0.35, 0.72, noise(p * 0.7 + vec2(uTime * 0.09, -uTime * 0.04)));
  float shoreline = 1.0 - smoothstep(0.015, 0.065, abs(depth - 0.035));
  // Crests travel in world space toward the cove. Depth only limits where they break; it no longer repeats foam at
  // regular depth intervals, which produced parallel outlines of the whole seabed.
  float phase = p.y * 0.6 - uTime * 0.85 + noise(p * 0.075) * 3.2 + sin(p.x * 0.21) * 0.45;
  float incoming = pow(max(0.0, 0.5 + 0.5 * sin(phase)), 9.0)
    * smoothstep(0.08, 0.28, depth) * (1.0 - smoothstep(0.65, 1.25, depth));
  float foamFilter = 1.0 - smoothstep(0.4, 1.8, length(fwidth(p)));
  float foam = (shoreline * (0.06 + broken * 0.26) + incoming * broken * 0.25) * foamFilter;
  col = mix(col, uFoam, clamp(foam, 0.0, 0.5));
  // Lighter fog than the land: the open sea keeps its blue far out, then still meets the haze at the far plane.
  // Its haze leans toward the upper sky's blue (as does the sky below the horizon), so a golden afternoon's beige fog
  // does not turn the whole sea beige; it still reaches full haze at the far plane, where the sky dome takes over.
  float haze = smoothstep(80.0, 318.0, vFogDepth);
  gl_FragColor = vec4(mix(col, mix(uSkyHorizon, uSkyTop, 0.42), haze), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
const COLORS = {
  deep: [new Color(0x1d5a82), new Color(0x244851), new Color(0x101c28)],
  shallow: [new Color(0x48b9b4), new Color(0x4e7b78), new Color(0x244248)],
  foam: [new Color(0xe8f2ee), new Color(0xb9b4d4), new Color(0x5a6890)],
}
const pick = (set: Color[], out: Color) => {
  const t = atmosphere.time
  return t <= 1 ? out.copy(set[0]).lerp(set[1], t) : out.copy(set[1]).lerp(set[2], t - 1)
}

/** Seabed heights on a CELL-metre grid over the island ground. */
function bakeSeabed(rect: typeof ISLAND_EXTENT, cell: number) {
  const { minX, maxX, minZ, maxZ } = rect
  const w = Math.ceil((maxX - minX) / cell) + 1, h = Math.ceil((maxZ - minZ) / cell) + 1, data = new Float32Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) data[j * w + i] = heightAt(minX + (i * (maxX - minX)) / (w - 1), minZ + (j * (maxZ - minZ)) / (h - 1))
  const texture = new DataTexture(data, w, h, RedFormat, FloatType)
  texture.magFilter = texture.minFilter = LinearFilter; texture.needsUpdate = true
  return { texture, grid: new Vector2(w, h) }
}

export function Sea() {
  const mesh = useRef<Mesh>(null)
  const { geometry, material, seabed, coveBed } = useMemo(() => {
    const seabed = bakeSeabed(ISLAND_EXTENT, CELL), coveBed = bakeSeabed(COVE_RECT, COVE_CELL), { minX, maxX, minZ, maxZ } = ISLAND_EXTENT
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([UniformsLib.fog, {
        uTime: { value: 0 }, uRect: { value: new Vector4(minX, minZ, maxX - minX, maxZ - minZ) }, uGrid: { value: seabed.grid },
        uCoveRect: { value: new Vector4(COVE_RECT.minX, COVE_RECT.minZ, COVE_RECT.maxX - COVE_RECT.minX, COVE_RECT.maxZ - COVE_RECT.minZ) }, uCoveGrid: { value: coveBed.grid },
        uDeep: { value: new Color() }, uShallow: { value: new Color() }, uFoam: { value: new Color() }, uSkyTop: { value: new Color() }, uSkyHorizon: { value: new Color() },
        uSunDir: { value: new Vector3() }, uSunColor: { value: new Color() }, uSun: { value: 1 }, uMoonDir: { value: new Vector3() }, uMoon: { value: 0 },
      }]), vertexShader, fragmentShader, fog: true,
    })
    material.uniforms.uTime = surfTime
    material.uniforms.uSeabed = { value: seabed.texture } // shared, not cloned by merge
    material.uniforms.uCoveBed = { value: coveBed.texture }
    return { geometry: new PlaneGeometry(SIZE, SIZE, 340, 340).rotateX(-Math.PI / 2), material, seabed: seabed.texture, coveBed: coveBed.texture }
  }, [])
  useEffect(() => () => { geometry.dispose(); material.dispose(); seabed.dispose(); coveBed.dispose() }, [geometry, material, seabed, coveBed])
  useFrame(({ camera, clock }) => {
    const u = material.uniforms, p = atmosphere.preset
    mesh.current?.position.set(Math.round(camera.position.x / SNAP) * SNAP, SEA_LEVEL, Math.round(camera.position.z / SNAP) * SNAP)
    u.uTime.value = clock.elapsedTime
    pick(COLORS.deep, u.uDeep.value); pick(COLORS.shallow, u.uShallow.value); pick(COLORS.foam, u.uFoam.value)
    u.uSkyTop.value.setHex(p.skyTop); u.uSkyHorizon.value.setHex(p.skyHorizon)
    u.uSunDir.value.copy(atmosphere.sunDirection); u.uSunColor.value.setHex(p.sun); u.uSun.value = p.sunGlow
    u.uMoonDir.value.copy(atmosphere.moonDirection); u.uMoon.value = atmosphere.night
  })
  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} userData={{ aoSurface: true }}/>
}
