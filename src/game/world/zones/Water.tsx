import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3 as V3, Vector4, type Mesh, type Vector3 } from 'three'
import { createPlanarReflection } from '../../rendering/planarReflection'
import { atmosphere } from '../../rendering/timeOfDay'
import { soundscape } from '../../audio/engine'
import { useGameStore } from '../../../state/gameStore'
import { CHANNEL, CHANNEL_SHORE, DEEP_DEPTH, SHALLOW_DEPTH, WATER_LEVEL, islands, pools, wading } from './wetlandLayout'
import { GLEN, LAKE, WETLAND } from '../regions'
import { sz } from '../scale'
// Wetland water: one transparent plane at the waterline over every pool and the channel; dry ground pokes through it.
// Code-generated surface (no texture assets): reflects the horizon at grazing angles, shimmers slightly, and shows ripple
// rings where the player wades. Ripples and splashes are spawned here from the player's position and speed. The shader
// evaluates the same pool shapes as `basinDepth` and fades the water over its first centimetres, so shorelines read round
// even though the ground mesh crossing the waterline is coarse.
// 2026-11-12 (third visual pass): the concept boards' wetland is a mirror of glowing flowers, lanterns and fireflies. On
// medium and high quality the surface reflects the scene (planar reflection at reduced resolution, rendered only while
// the water is in view), distorted by small waves and the wading rings, with a fresnel blend and a sun glint.
const MAX_RIPPLES = 8, RIPPLE_LIFE = 2.2, WADE_DEPTH = 0.04
const DAY_WATER = new Color(0x2c4644), TWILIGHT_WATER = new Color(0x111a2c)
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
const POOL_DATA = pools.map(p => `vec4(${p.x.toFixed(2)}, ${p.z.toFixed(2)}, ${p.r.toFixed(2)}, ${(p.deep ? DEEP_DEPTH : SHALLOW_DEPTH).toFixed(2)})`).join(', ')
const f = (v: number) => v.toFixed(2)
const fragmentShader = `uniform vec3 uWater; uniform vec3 uSky; uniform float uTime; uniform vec4 uRipples[${MAX_RIPPLES}];
uniform sampler2D uReflection; uniform float uReflect; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uGlint;
varying vec3 vWorld; varying vec4 vRefl;
#include <fog_pars_fragment>
const vec4 POOLS[${pools.length}] = vec4[${pools.length}](${POOL_DATA});
// Mirror of basinDepth() in wetlandLayout.ts.
float basin(vec2 p) {
  float depth = 0.0;
  for (int i = 0; i < ${pools.length}; i++) {
    vec2 rel = p - POOLS[i].xy;
    float a = atan(rel.y, rel.x), fi = float(i);
    float d = length(rel) / (1.0 + 0.13 * sin(3.0 * a + fi * 1.7) + 0.07 * sin(5.0 * a + fi * 2.9)); // shoreScale()
    depth = min(depth, POOLS[i].w * (1.0 - smoothstep(POOLS[i].z * 0.55, POOLS[i].z, d)));
  }
${islands.map(i => `  depth *= smoothstep(${f(i.r)}, ${f(i.r * 1.5)}, distance(p, vec2(${f(i.x)}, ${f(i.z)})));`).join(' ')}
  if (p.x > ${f(CHANNEL.minX)} && p.x < ${f(CHANNEL.maxX)}) {
    float south = ${f(CHANNEL.minZ)} + ${f(sz(0.4))} * (1.0 + sin(p.x * 0.18)), north = ${f(CHANNEL.maxZ)} - ${f(sz(0.4))} * (1.0 + sin(p.x * 0.15 + 1.3)); // channelBanks()
    float outside = max(max(south - p.y, p.y - north), 0.0);
    float fade = min(min(p.x - ${f(CHANNEL.minX)}, ${f(CHANNEL.maxX)} - p.x), 6.0) / 6.0;
    depth = min(depth, ${f(DEEP_DEPTH)} * (1.0 - smoothstep(0.0, ${f(CHANNEL_SHORE)}, outside)) * fade);
  }
  return depth;
}
void main() {
  vec3 toEye = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - clamp(toEye.y, 0.0, 1.0), 4.0);
  // Small waves: analytic slopes of a few travelling sines (no texture), plus the slopes of the wading rings.
  vec2 p = vWorld.xz, slope = vec2(0.0);
  slope += vec2(0.37, 0.0) * cos(p.x * 3.7 + uTime * 0.9) * sin(p.y * 3.1 - uTime * 0.7);
  slope += vec2(0.0, 0.31) * sin(p.x * 3.7 + uTime * 0.9) * cos(p.y * 3.1 - uTime * 0.7);
  slope += vec2(0.3, 0.3) * cos((p.x + p.y) * 6.3 + uTime * 1.6);
  slope += vec2(0.12, -0.2) * cos(dot(p, vec2(0.7, -1.1)) * 1.3 + uTime * 0.5);
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
  // Deeper water is darker and more saturated; the shallows let the mud tint through.
  vec3 body = mix(uWater * 1.35, uWater * 0.7, smoothstep(0.1, 1.2, depth));
  vec3 color;
  if (uReflect > 0.5) {
    vec2 uv = vRefl.xy / vRefl.w + n.xz * 0.6 * (0.4 + 0.6 * fresnel);
    vec3 mirrored = texture2D(uReflection, uv).rgb;
    float r = 0.3 + 0.62 * pow(1.0 - clamp(dot(toEye, n), 0.0, 1.0), 2.5);
    color = mix(body, mirrored, r);
  } else {
    float shimmer = sin(vWorld.x * 3.7 + uTime * 0.9) * sin(vWorld.z * 3.1 - uTime * 0.7) + 0.5 * sin((vWorld.x + vWorld.z) * 6.3 + uTime * 1.6);
    color = mix(body, uSky, 0.06 + 0.5 * fresnel) + uSky * 0.025 * shimmer * (0.3 + fresnel);
  }
  // Sun glint on the wave facets, and a soft highlight on the wading rings.
  float glint = pow(max(dot(reflect(-toEye, n), uSunDir), 0.0), 240.0);
  color += uSunColor * glint * uGlint + uSky * 0.16 * min(rings, 1.0);
  gl_FragColor = vec4(color, (0.86 + 0.12 * fresnel) * smoothstep(0.0, 0.1, depth));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

/** Water planes: the wetlands with the channel and the mirror lake; and the waterfall glen's pool and stream. */
export const WATER_AREAS = {
  wetland: { minX: Math.min(WETLAND.minX, CHANNEL.minX, LAKE.minX) - 2, maxX: Math.max(WETLAND.maxX, CHANNEL.maxX) + 2, minZ: Math.min(WETLAND.minZ, LAKE.minZ) - 2, maxZ: CHANNEL.maxZ + 3 },
  glen: { minX: GLEN.minX - 2, maxX: GLEN.maxX + 2, minZ: GLEN.minZ - 2, maxZ: GLEN.maxZ + 2 },
} as const

export function Water({ player, velocity, area = WATER_AREAS.wetland }: { player: Vector3; velocity: Vector3; area?: { minX: number; maxX: number; minZ: number; maxZ: number } }) {
  const { geometry, material, ripples, reflection } = useMemo(() => {
    // Covers its area; beyond the pools the ground rises above the waterline and hides the plane.
    const { minX, maxX, minZ, maxZ } = area
    const geometry = new PlaneGeometry(maxX - minX, maxZ - minZ).rotateX(-Math.PI / 2).translate((minX + maxX) / 2, WATER_LEVEL, (minZ + maxZ) / 2)
    const ripples = Array.from({ length: MAX_RIPPLES }, () => new Vector4(0, 0, -100, 0))
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([UniformsLib.fog, { uWater: { value: new Color() }, uSky: { value: new Color() }, uTime: { value: 0 }, uReflect: { value: 0 },
        uSunDir: { value: new V3(0, 1, 0) }, uSunColor: { value: new Color() }, uGlint: { value: 0 } }]),
      vertexShader, fragmentShader, transparent: true, depthWrite: false, fog: true,
    })
    material.uniforms.uRipples = { value: ripples } // shared array, not cloned by merge
    const reflection = createPlanarReflection(WATER_LEVEL)
    material.uniforms.uReflection = { value: reflection.target.texture }
    material.uniforms.uTexMatrix = { value: reflection.textureMatrix }
    return { geometry, material, ripples, reflection }
  }, [area])
  const reflectionScale = useGameStore(s => REFLECTION_SCALE[s.quality])
  useEffect(() => () => reflection.dispose(), [reflection])
  // three calls onBeforeRender just before the water draws, i.e. only while the water is in view.
  const mesh = useRef<Mesh>(null)
  useEffect(() => {
    const water = mesh.current
    if (!water) return
    material.uniforms.uReflect.value = reflectionScale > 0 ? 1 : 0
    water.onBeforeRender = reflectionScale > 0 ? (renderer, scene, camera) => reflection.render(renderer, scene, camera, water, reflectionScale) : () => {}
  }, [material, reflection, reflectionScale])
  const wade = useMemo(() => ({ timer: 0, next: 0 }), [])
  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime
    material.uniforms.uTime.value = now
    material.uniforms.uWater.value.copy(DAY_WATER).lerp(TWILIGHT_WATER, atmosphere.blend)
    material.uniforms.uSky.value.setHex(atmosphere.preset.skyHorizon)
    material.uniforms.uSunDir.value.copy(atmosphere.sunDirection); material.uniforms.uSunColor.value.setHex(atmosphere.preset.sun)
    material.uniforms.uGlint.value = 6 * atmosphere.preset.sunGlow
    // A ring and a splash per step while wading; steps come faster when running.
    // Each plane only handles the player inside its own area, so two planes never both splash.
    const inArea = player.x > area.minX && player.x < area.maxX && player.z > area.minZ && player.z < area.maxZ
    const speed = Math.hypot(velocity.x, velocity.z), inWater = inArea && wading(player.x, player.y, player.z, WADE_DEPTH)
    if (useGameStore.getState().phase !== 'playing' || !inWater || speed < 0.5) { wade.timer = 0; return }
    if ((wade.timer -= Math.min(delta, 0.1)) > 0) return
    wade.timer = speed > 5 ? 0.28 : 0.42
    ripples[wade.next].set(player.x, player.z, now, Math.min(1, speed / 4))
    wade.next = (wade.next + 1) % MAX_RIPPLES
    soundscape.splash(player.x, WATER_LEVEL, player.z, Math.min(1, speed / 6))
  })
  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={1}/>
}
