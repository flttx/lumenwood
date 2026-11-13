import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DataTexture, FloatType, LinearFilter, PlaneGeometry, RedFormat, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, Vector4, type Mesh } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { SEA_LEVEL, heightAt } from '../terrain/terrain'
import { ISLAND_EXTENT } from '../terrain/Ground'
// The sea around the island (third pass, 2026-11-12; the user: the forest should be an island in the sea). One large plane
// at SEA_LEVEL follows the camera out to the far plane; the fog carries it into the horizon haze. Code-only shading:
// - colour by depth from a baked seabed map: turquoise shallows over the sand, deep blue further out;
// - small travelling waves give the normal; the sky's colours are reflected with a fresnel blend;
// - a glitter path toward the sun by day and the moon by night;
// - surf: foam lines that roll in toward the beaches and wash along the sea cliff.
const SIZE = 680, SNAP = 8, CELL = 3
const vertexShader = `varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const fragmentShader = `uniform float uTime; uniform sampler2D uSeabed; uniform vec4 uRect;
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; uniform vec3 uFoam;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSun; uniform vec3 uMoonDir; uniform float uMoon;
varying vec3 vWorld;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// Slope (d height / dx, dz) of a few travelling waves, long swell to small chop.
vec2 waves(vec2 p, float t) {
  vec2 s = vec2(0.0);
  vec4 w[5]; // direction xy, frequency, speed
  w[0] = vec4(0.8, 0.6, 0.11, 0.9); w[1] = vec4(-0.4, 0.9, 0.23, 1.3); w[2] = vec4(0.95, -0.3, 0.47, 1.9);
  w[3] = vec4(-0.7, -0.7, 0.9, 2.6); w[4] = vec4(0.2, 1.0, 1.7, 3.4);
  for (int i = 0; i < 5; i++) {
    vec2 d = normalize(w[i].xy); float a = 0.35 / (1.0 + float(i) * 1.4);
    s += d * a * w[i].z * cos(dot(d, p) * w[i].z + t * w[i].w);
  }
  return s;
}
void main() {
  vec2 uv = (vWorld.xz - uRect.xy) / uRect.zw;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float bed = mix(-16.0, texture2D(uSeabed, clamp(uv, 0.0, 1.0)).r, inside);
  float depth = ${SEA_LEVEL.toFixed(2)} - bed;
  if (depth < -0.05) discard; // dry land: the ground hides the sea anyway
  vec3 toEye = normalize(cameraPosition - vWorld);
  float dist = length(cameraPosition - vWorld);
  vec2 slope = waves(vWorld.xz, uTime) * mix(1.0, 0.35, smoothstep(40.0, 220.0, dist)); // calmer toward the horizon
  vec3 n = normalize(vec3(-slope.x * 0.35, 1.0, -slope.y * 0.35));
  float cosV = clamp(dot(toEye, n), 0.0, 1.0);
  float fresnel = 0.06 + 0.55 * pow(1.0 - cosV, 4.0);
  vec3 r = reflect(-toEye, n);
  // Reflect mostly the upper sky: a warm horizon mirrored at grazing angles turned the whole sea beige.
  vec3 sky = mix(uSkyHorizon, uSkyTop, 0.45 + 0.55 * pow(clamp(r.y, 0.0, 1.0), 0.4));
  vec3 body = mix(uShallow, uDeep, smoothstep(0.2, 7.0, depth));
  vec3 col = mix(body, sky, fresnel);
  // Glitter path: sharp sparkles plus a broad sheen toward the sun (or moon).
  float sunR = max(dot(r, uSunDir), 0.0), moonR = max(dot(r, uMoonDir), 0.0);
  float sparkle = step(0.6, noise(vWorld.xz * 2.3 + uTime * 1.7));
  col += uSunColor * uSun * (pow(sunR, 320.0) * 6.0 * (0.4 + sparkle) + pow(sunR, 24.0) * 0.18);
  col += vec3(0.75, 0.82, 1.0) * uMoon * (pow(moonR, 260.0) * 3.0 * (0.4 + sparkle) + pow(moonR, 18.0) * 0.1);
  // Surf: lines of foam rolling shoreward through the shallows, broken up by noise, densest at the waterline.
  float shore = 1.0 - smoothstep(0.0, 2.2, depth);
  float roll = sin(depth * 5.0 + uTime * 1.6 + noise(vWorld.xz * 0.15) * 6.0);
  float foam = shore * smoothstep(0.55, 0.95, roll * 0.5 + 0.5) * smoothstep(0.25, 0.6, noise(vWorld.xz * 0.9 + uTime * 0.3));
  foam = max(foam, (1.0 - smoothstep(0.0, 0.25, depth)) * (0.55 + 0.45 * noise(vWorld.xz * 1.6 - uTime * 0.5)));
  col = mix(col, uFoam, clamp(foam, 0.0, 1.0) * 0.85);
  // Lighter fog than the land: the open sea keeps its blue far out, then still meets the haze at the far plane.
  // Its haze leans toward the upper sky's blue (as does the sky below the horizon), so a golden afternoon's beige fog
  // does not turn the whole sea beige; it still reaches full haze at the far plane, where the sky dome takes over.
  float haze = max(smoothstep(fogNear * 2.4, fogFar * 2.0, vFogDepth), smoothstep(250.0, 318.0, vFogDepth));
  gl_FragColor = vec4(mix(col, mix(fogColor, uSkyTop, 0.35), haze), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
const COLORS = {
  deep: [new Color(0x1d5a82), new Color(0x1a2c5e), new Color(0x060d24)],
  shallow: [new Color(0x48b9b4), new Color(0x346a8c), new Color(0x0f2c48)],
  foam: [new Color(0xe8f2ee), new Color(0xb9b4d4), new Color(0x5a6890)],
}
const pick = (set: Color[], out: Color) => {
  const t = atmosphere.time
  return t <= 1 ? out.copy(set[0]).lerp(set[1], t) : out.copy(set[1]).lerp(set[2], t - 1)
}

/** Seabed heights on a CELL-metre grid over the island ground. */
function bakeSeabed() {
  const { minX, maxX, minZ, maxZ } = ISLAND_EXTENT
  const w = Math.ceil((maxX - minX) / CELL) + 1, h = Math.ceil((maxZ - minZ) / CELL) + 1, data = new Float32Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) data[j * w + i] = heightAt(minX + (i * (maxX - minX)) / (w - 1), minZ + (j * (maxZ - minZ)) / (h - 1))
  const texture = new DataTexture(data, w, h, RedFormat, FloatType)
  texture.magFilter = texture.minFilter = LinearFilter; texture.needsUpdate = true
  return texture
}

export function Sea() {
  const mesh = useRef<Mesh>(null)
  const { geometry, material, seabed } = useMemo(() => {
    const seabed = bakeSeabed(), { minX, maxX, minZ, maxZ } = ISLAND_EXTENT
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([UniformsLib.fog, {
        uTime: { value: 0 }, uRect: { value: new Vector4(minX, minZ, maxX - minX, maxZ - minZ) },
        uDeep: { value: new Color() }, uShallow: { value: new Color() }, uFoam: { value: new Color() }, uSkyTop: { value: new Color() }, uSkyHorizon: { value: new Color() },
        uSunDir: { value: new Vector3() }, uSunColor: { value: new Color() }, uSun: { value: 1 }, uMoonDir: { value: new Vector3() }, uMoon: { value: 0 },
      }]), vertexShader, fragmentShader, fog: true,
    })
    material.uniforms.uSeabed = { value: seabed } // shared, not cloned by merge
    return { geometry: new PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), material, seabed }
  }, [])
  useEffect(() => () => { geometry.dispose(); material.dispose(); seabed.dispose() }, [geometry, material, seabed])
  useFrame(({ camera, clock }) => {
    const u = material.uniforms, p = atmosphere.preset
    mesh.current?.position.set(Math.round(camera.position.x / SNAP) * SNAP, SEA_LEVEL, Math.round(camera.position.z / SNAP) * SNAP)
    u.uTime.value = clock.elapsedTime
    pick(COLORS.deep, u.uDeep.value); pick(COLORS.shallow, u.uShallow.value); pick(COLORS.foam, u.uFoam.value)
    u.uSkyTop.value.setHex(p.skyTop); u.uSkyHorizon.value.setHex(p.skyHorizon)
    u.uSunDir.value.copy(atmosphere.sunDirection); u.uSunColor.value.setHex(p.sun); u.uSun.value = p.sunGlow
    u.uMoonDir.value.copy(atmosphere.moonDirection); u.uMoon.value = atmosphere.night
  })
  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false}/>
}
