import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 as V3, Vector4, type Mesh, type Vector3 } from 'three'
import { createPlanarReflection, reflectionSkips } from '../../rendering/planarReflection'
import { atmosphere } from '../../rendering/timeOfDay'
import { soundscape } from '../../audio/engine'
import { useGameStore } from '../../../state/gameStore'
import { CHANNEL, CHANNEL_SHORE, DEEP_DEPTH, SHALLOW_DEPTH, WATER_LEVEL, islands, pools, wading } from './wetlandLayout'
import { GLEN, LAKE, WETLAND } from '../regions'
import { sz } from '../scale'
import { smoothstep } from '../../shared/math'
// Wetland & glen water: transparent planes at the waterline with area-filtered analytic pools, planar reflections on
// medium/high (proximity-gated so camp views never render occluded wetland/glen reflections), moonlight + sun glints,
// wading ripples, and a sky-gradient fallback on low quality.
const MAX_RIPPLES = 8, RIPPLE_LIFE = 2.2, WADE_DEPTH = 0.04, REFLECT_RANGE = 88
const DAY_WATER = new Color(0x2c4644), TWILIGHT_WATER = new Color(0x111a2c), NIGHT_WATER = new Color(0x0b1526)
/** Reflection target size relative to the drawing buffer; 0 falls back to the sky-tinted surface. */
const REFLECTION_SCALE = { low: 0, medium: 0.35, high: 0.5 } as const
const vertexShader = `varying vec3 vWorld; varying vec4 vRefl; uniform mat4 uTexMatrix;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz; vRefl = uTexMatrix * world;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const f = (v: number) => v.toFixed(2)
type WaterArea = { minX: number; maxX: number; minZ: number; maxZ: number }

/** Builds an area-specific fragment shader containing only pools overlapping `area`, avoiding wasted trig per pixel. */
function buildFragmentShader(area: WaterArea) {
  const localPools = pools.map((p, idx) => ({ p, idx })).filter(({ p }) =>
    p.x + p.r * 1.25 >= area.minX && p.x - p.r * 1.25 <= area.maxX && p.z + p.r * 1.25 >= area.minZ && p.z - p.r * 1.25 <= area.maxZ)
  const poolData = localPools.map(({ p }) => `vec4(${p.x.toFixed(2)}, ${p.z.toFixed(2)}, ${p.r.toFixed(2)}, ${(p.deep ? DEEP_DEPTH : SHALLOW_DEPTH).toFixed(2)})`).join(', ')
  const poolIndices = localPools.map(({ idx }) => idx.toFixed(1)).join(', ')
  const localIslands = islands.filter(i => i.x + i.r * 1.6 >= area.minX && i.x - i.r * 1.6 <= area.maxX && i.z + i.r * 1.6 >= area.minZ && i.z - i.r * 1.6 <= area.maxZ)
  const hasChannel = CHANNEL.maxX >= area.minX && CHANNEL.minX <= area.maxX && CHANNEL.maxZ >= area.minZ && CHANNEL.minZ <= area.maxZ
  return `uniform vec3 uWater; uniform vec3 uSky; uniform vec3 uSkyTop; uniform float uTime; uniform vec4 uRipples[${MAX_RIPPLES}];
uniform sampler2D uReflection; uniform float uReflect; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uGlint;
uniform vec3 uMoonDir; uniform float uMoonGlint;
varying vec3 vWorld; varying vec4 vRefl;
#include <fog_pars_fragment>
const vec4 POOLS[${Math.max(1, localPools.length)}] = vec4[${Math.max(1, localPools.length)}](${poolData || 'vec4(0.0)'});
const float POOL_IDS[${Math.max(1, localPools.length)}] = float[${Math.max(1, localPools.length)}](${poolIndices || '0.0'});
// Mirror of basinDepth() in wetlandLayout.ts for pools inside this plane.
float basin(vec2 p) {
  float depth = 0.0;
  for (int i = 0; i < ${localPools.length}; i++) {
    vec2 rel = p - POOLS[i].xy;
    float a = atan(rel.y, rel.x), fi = POOL_IDS[i];
    float d = length(rel) / (1.0 + 0.13 * sin(3.0 * a + fi * 1.7) + 0.07 * sin(5.0 * a + fi * 2.9));
    depth = min(depth, POOLS[i].w * (1.0 - smoothstep(POOLS[i].z * 0.55, POOLS[i].z, d)));
  }
${localIslands.map(i => `  depth *= smoothstep(${f(i.r)}, ${f(i.r * 1.5)}, distance(p, vec2(${f(i.x)}, ${f(i.z)})));`).join(' ')}
${hasChannel ? `  if (p.x > ${f(CHANNEL.minX)} && p.x < ${f(CHANNEL.maxX)}) {
    float south = ${f(CHANNEL.minZ)} + ${f(sz(0.4))} * (1.0 + sin(p.x * 0.18)), north = ${f(CHANNEL.maxZ)} - ${f(sz(0.4))} * (1.0 + sin(p.x * 0.15 + 1.3));
    float outside = max(max(south - p.y, p.y - north), 0.0);
    float fade = min(min(p.x - ${f(CHANNEL.minX)}, ${f(CHANNEL.maxX)} - p.x), 6.0) / 6.0;
    depth = min(depth, ${f(DEEP_DEPTH)} * (1.0 - smoothstep(0.0, ${f(CHANNEL_SHORE)}, outside)) * fade);
  }` : ''}
  return depth;
}
void main() {
  vec3 toEye = normalize(cameraPosition - vWorld);
  float cosV = clamp(toEye.y, 0.0, 1.0);
  float fresnel = pow(1.0 - cosV, 4.0);
  // Small waves: analytic slopes of travelling sines plus wading rings.
  vec2 p = vWorld.xz, slope = vec2(0.0);
  float fine = 1.0 - smoothstep(0.2, 0.8, max(fwidth(p.x), fwidth(p.y)));
  slope += vec2(0.06, 0.08) * cos(dot(p, vec2(0.6, 0.8)) * 0.9 + uTime * 0.32);
  slope += vec2(-0.048, 0.036) * cos(dot(p, vec2(-0.8, 0.6)) * 1.7 - uTime * 0.42);
  slope += vec2(0.008, 0.018) * cos(dot(p, vec2(0.4, 0.9)) * 3.2 + uTime * 0.6) * fine;
  float rings = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > ${RIPPLE_LIFE.toFixed(1)}) continue;
    vec2 rel = vWorld.xz - r.xy; float d = length(rel), front = age * 0.9;
    float k = r.w * (1.0 - age / ${RIPPLE_LIFE.toFixed(1)}) * smoothstep(0.0, 0.2, front);
    float band = 1.0 - smoothstep(0.0, 0.22, abs(d - front));
    rings += k * band;
    slope += (d > 0.001 ? rel / d : vec2(0.0)) * k * sin((d - front) * 28.0) * band * 2.5;
  }
  vec3 n = normalize(vec3(-slope.x * 0.06, 1.0, -slope.y * 0.06));
  float depth = ${f(WATER_LEVEL)} - basin(vWorld.xz);
  vec3 body = mix(uWater * 1.35, uWater * 0.7, smoothstep(0.1, 1.2, depth));
  vec3 color;
  if (uReflect > 0.5) {
    vec2 uv = vRefl.xy / max(abs(vRefl.w), 1e-4) + n.xz * 0.12 * (0.4 + 0.6 * fresnel);
    vec3 mirrored = texture2D(uReflection, clamp(uv, vec2(0.002), vec2(0.998))).rgb;
    float r = 0.24 + 0.62 * pow(1.0 - clamp(dot(toEye, n), 0.0, 1.0), 2.5);
    color = mix(body, mirrored, r);
  } else {
    // Low quality: smooth reflected sky gradient + cross-wave micro-shimmer instead of flat horizon stripes.
    vec3 skyGrad = mix(uSky, uSkyTop, 0.28 + 0.55 * cosV);
    float shimmer = dot(slope, vec2(0.55, 0.45)) * (0.6 + 0.4 * fine);
    float bankShade = smoothstep(0.05, 0.6, depth);
    color = mix(body * (0.85 + 0.15 * bankShade), skyGrad, 0.14 + 0.56 * fresnel) + skyGrad * shimmer * (0.12 + 0.25 * fresnel);
  }
  vec3 reflDir = reflect(-toEye, n);
  float sunGlint = pow(max(dot(reflDir, uSunDir), 0.0), 240.0);
  float moonGlint = pow(max(dot(reflDir, uMoonDir), 0.0), 180.0);
  color += uSunColor * sunGlint * uGlint + vec3(0.75, 0.84, 1.0) * moonGlint * uMoonGlint + uSky * 0.16 * min(rings, 1.0);
  gl_FragColor = vec4(color, (0.86 + 0.12 * fresnel) * smoothstep(0.0, 0.1, depth));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`
}

/** Water planes: the wetlands with the channel and the mirror lake; and the waterfall glen's pool and stream. */
export const WATER_AREAS = {
  wetland: { minX: Math.min(WETLAND.minX, CHANNEL.minX, LAKE.minX) - 2, maxX: Math.max(WETLAND.maxX, CHANNEL.maxX) + 2, minZ: Math.min(WETLAND.minZ, LAKE.minZ) - 2, maxZ: CHANNEL.maxZ + 3 },
  glen: { minX: GLEN.minX - 2, maxX: GLEN.maxX + 2, minZ: GLEN.minZ - 2, maxZ: GLEN.maxZ + 2 },
} as const

export function Water({ player, velocity, area = WATER_AREAS.wetland }: { player: Vector3; velocity: Vector3; area?: WaterArea }) {
  const { geometry, material, ripples, reflection } = useMemo(() => {
    const { minX, maxX, minZ, maxZ } = area
    const geometry = new PlaneGeometry(maxX - minX, maxZ - minZ).rotateX(-Math.PI / 2).translate((minX + maxX) / 2, WATER_LEVEL, (minZ + maxZ) / 2)
    const ripples = Array.from({ length: MAX_RIPPLES }, () => new Vector4(0, 0, -100, 0))
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([UniformsLib.fog, { uWater: { value: new Color() }, uSky: { value: new Color() }, uSkyTop: { value: new Color() }, uTime: { value: 0 }, uReflect: { value: 0 },
        uSunDir: { value: new V3(0, 1, 0) }, uSunColor: { value: new Color() }, uGlint: { value: 0 }, uMoonDir: { value: new V3(0, 1, 0) }, uMoonGlint: { value: 0 } }]),
      vertexShader, fragmentShader: buildFragmentShader(area), transparent: true, depthWrite: false, fog: true,
    })
    material.uniforms.uRipples = { value: ripples } // shared array, not cloned by merge
    const reflection = createPlanarReflection(WATER_LEVEL)
    material.uniforms.uReflection = { value: reflection.target.texture }
    material.uniforms.uTexMatrix = { value: reflection.textureMatrix }
    return { geometry, material, ripples, reflection }
  }, [area])
  const reflectionScale = useGameStore(s => REFLECTION_SCALE[s.quality])
  const mesh = useRef<Mesh>(null)
  useEffect(() => () => { geometry.dispose(); material.dispose(); reflection.dispose() }, [geometry, material, reflection])
  useEffect(() => {
    const water = mesh.current
    if (!water) return
    // Exclude this water plane from other water planes' reflections (prevents nested reflections).
    reflectionSkips.add(water)
    return () => { reflectionSkips.delete(water) }
  }, [])
  useEffect(() => {
    const water = mesh.current
    if (!water) return
    if (reflectionScale === 0) reflection.target.setSize(1, 1) // release VRAM on low quality
    water.onBeforeRender = reflectionScale > 0 ? (renderer, scene, camera) => {
      // Only pay for planar reflection when the camera is near enough to actually see this water body.
      const dx = Math.max(area.minX - camera.position.x, 0, camera.position.x - area.maxX)
      const dz = Math.max(area.minZ - camera.position.z, 0, camera.position.z - area.maxZ)
      const near = Math.hypot(dx, dz) < REFLECT_RANGE
      material.uniforms.uReflect.value = near ? 1 : 0
      if (near) reflection.render(renderer, scene, camera, water, reflectionScale)
    } : () => { material.uniforms.uReflect.value = 0 }
    return () => { water.onBeforeRender = () => {} }
  }, [area, material, reflection, reflectionScale])
  const wade = useMemo(() => ({ timer: 0, next: 0 }), [])
  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime, dt = Math.min(delta, 0.1)
    material.uniforms.uTime.value = now
    if (atmosphere.time <= 1) material.uniforms.uWater.value.copy(DAY_WATER).lerp(TWILIGHT_WATER, atmosphere.blend)
    else material.uniforms.uWater.value.copy(TWILIGHT_WATER).lerp(NIGHT_WATER, atmosphere.night)
    material.uniforms.uSky.value.setHex(atmosphere.preset.skyHorizon)
    material.uniforms.uSkyTop.value.setHex(atmosphere.preset.skyTop)
    material.uniforms.uSunDir.value.copy(atmosphere.sunDirection); material.uniforms.uSunColor.value.setHex(atmosphere.preset.sun)
    material.uniforms.uGlint.value = 6 * atmosphere.preset.sunGlow
    material.uniforms.uMoonDir.value.copy(atmosphere.moonDirection)
    material.uniforms.uMoonGlint.value = 2.6 * smoothstep(0.7, 1.5, atmosphere.time)
    // A ring and a splash per step while wading; steps come faster when running.
    const inArea = player.x > area.minX && player.x < area.maxX && player.z > area.minZ && player.z < area.maxZ
    const speed = Math.hypot(velocity.x, velocity.z), inWater = inArea && wading(player.x, player.y, player.z, WADE_DEPTH)
    wade.timer = Math.max(0, wade.timer - dt)
    if (useGameStore.getState().phase !== 'playing' || !inWater || speed < 0.5) return
    if (wade.timer > 0) return
    wade.timer = speed > 5 ? 0.28 : 0.42
    ripples[wade.next].set(player.x, player.z, now, Math.min(1, speed / 4))
    wade.next = (wade.next + 1) % MAX_RIPPLES
    soundscape.splash(player.x, WATER_LEVEL, player.z, Math.min(1, speed / 6))
  })
  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={1}/>
}
