import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector4, type Vector3 } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { soundscape } from '../../audio/engine'
import { useGameStore } from '../../../state/gameStore'
import { heightAt } from '../terrain/terrain'
import { CHANNEL, CHANNEL_SHORE, DEEP_DEPTH, SHALLOW_DEPTH, WATER_LEVEL, pools } from './wetlandLayout'
import { WETLAND } from '../regions'
// Wetland water: one transparent plane at the waterline over every pool and the channel; dry ground pokes through it.
// Code-generated surface (no texture assets): reflects the horizon at grazing angles, shimmers slightly, and shows ripple
// rings where the player wades. Ripples and splashes are spawned here from the player's position and speed. The shader
// evaluates the same pool shapes as `basinDepth` and fades the water over its first centimetres, so shorelines read round
// even though the ground mesh crossing the waterline is coarse.
const MAX_RIPPLES = 8, RIPPLE_LIFE = 2.2, WADE_DEPTH = 0.04
const DAY_WATER = new Color(0x2c4644), TWILIGHT_WATER = new Color(0x111a2c)
const vertexShader = `varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const POOL_DATA = pools.map(p => `vec4(${p.x.toFixed(2)}, ${p.z.toFixed(2)}, ${p.r.toFixed(2)}, ${(p.deep ? DEEP_DEPTH : SHALLOW_DEPTH).toFixed(2)})`).join(', ')
const f = (v: number) => v.toFixed(2)
const fragmentShader = `uniform vec3 uWater; uniform vec3 uSky; uniform float uTime; uniform vec4 uRipples[${MAX_RIPPLES}];
varying vec3 vWorld;
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
  if (p.x > ${f(CHANNEL.minX)} && p.x < ${f(CHANNEL.maxX)}) {
    float south = ${f(CHANNEL.minZ)} + 0.4 * (1.0 + sin(p.x * 0.45)), north = ${f(CHANNEL.maxZ)} - 0.4 * (1.0 + sin(p.x * 0.37 + 1.3)); // channelBanks()
    float outside = max(max(south - p.y, p.y - north), 0.0);
    float fade = min(min(p.x - ${f(CHANNEL.minX)}, ${f(CHANNEL.maxX)} - p.x), 6.0) / 6.0;
    depth = min(depth, ${f(DEEP_DEPTH)} * (1.0 - smoothstep(0.0, ${f(CHANNEL_SHORE)}, outside)) * fade);
  }
  return depth;
}
void main() {
  vec3 toEye = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - clamp(toEye.y, 0.0, 1.0), 4.0);
  // Two slow interfering wave sets give a faint moving shimmer.
  float shimmer = sin(vWorld.x * 3.7 + uTime * 0.9) * sin(vWorld.z * 3.1 - uTime * 0.7) + 0.5 * sin((vWorld.x + vWorld.z) * 6.3 + uTime * 1.6);
  float rings = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > ${RIPPLE_LIFE.toFixed(1)}) continue;
    float d = distance(vWorld.xz, r.xy), front = age * 0.9;
    rings += r.w * (1.0 - age / ${RIPPLE_LIFE.toFixed(1)}) * (1.0 - smoothstep(0.0, 0.22, abs(d - front))) * smoothstep(0.0, 0.2, front);
  }
  float depth = ${f(WATER_LEVEL)} - basin(vWorld.xz);
  vec3 color = mix(uWater, uSky, 0.06 + 0.5 * fresnel) + uSky * (0.025 * shimmer * (0.3 + fresnel) + 0.16 * min(rings, 1.0));
  gl_FragColor = vec4(color, (0.82 + 0.14 * fresnel) * smoothstep(0.0, 0.1, depth));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

export function Water({ player, velocity }: { player: Vector3; velocity: Vector3 }) {
  const { geometry, material, ripples } = useMemo(() => {
    // Covers the wetlands and the full channel; beyond them the ground rises above the waterline and hides the plane.
    const minX = Math.min(WETLAND.minX, CHANNEL.minX) - 2, maxX = Math.max(WETLAND.maxX, CHANNEL.maxX) + 2, minZ = WETLAND.minZ - 2, maxZ = CHANNEL.maxZ + 3
    const geometry = new PlaneGeometry(maxX - minX, maxZ - minZ).rotateX(-Math.PI / 2).translate((minX + maxX) / 2, WATER_LEVEL, (minZ + maxZ) / 2)
    const ripples = Array.from({ length: MAX_RIPPLES }, () => new Vector4(0, 0, -100, 0))
    const material = new ShaderMaterial({
      uniforms: UniformsUtils.merge([UniformsLib.fog, { uWater: { value: new Color() }, uSky: { value: new Color() }, uTime: { value: 0 } }]),
      vertexShader, fragmentShader, transparent: true, depthWrite: false, fog: true,
    })
    material.uniforms.uRipples = { value: ripples } // shared array, not cloned by merge
    return { geometry, material, ripples }
  }, [])
  const wade = useMemo(() => ({ timer: 0, next: 0 }), [])
  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime
    material.uniforms.uTime.value = now
    material.uniforms.uWater.value.copy(DAY_WATER).lerp(TWILIGHT_WATER, atmosphere.blend)
    material.uniforms.uSky.value.setHex(atmosphere.preset.skyHorizon)
    // A ring and a splash per step while wading; steps come faster when running.
    const speed = Math.hypot(velocity.x, velocity.z), inWater = heightAt(player.x, player.z) < WATER_LEVEL - WADE_DEPTH
    if (useGameStore.getState().phase !== 'playing' || !inWater || speed < 0.5) { wade.timer = 0; return }
    if ((wade.timer -= Math.min(delta, 0.1)) > 0) return
    wade.timer = speed > 5 ? 0.28 : 0.42
    ripples[wade.next].set(player.x, player.z, now, Math.min(1, speed / 4))
    wade.next = (wade.next + 1) % MAX_RIPPLES
    soundscape.splash(player.x, WATER_LEVEL, player.z, Math.min(1, speed / 6))
  })
  return <mesh geometry={geometry} material={material} renderOrder={1}/>
}
