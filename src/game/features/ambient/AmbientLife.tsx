import { Suspense, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, Points, ShaderMaterial, Vector3 } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { random } from '../../shared/random'
import { heightAt } from '../../world/terrain/terrain'
import { trailTarget } from '../../rendering/Grass'
import { butterflyHomes, dragonflyHomes, type Home } from './ambientLayout'
import { Wildlife } from './Wildlife'
// Ambient life (scene enrichment, 2026-11-12): falling leaves, dust motes drifting in the sun, butterflies over the glades
// and dragonflies over the wetland pools. All code particles (AGENTS.md allows procedural particles): every path, tumble
// and wing beat runs in the vertex shader from a few per-frame uniforms, one draw call each, no per-frame CPU loops.
// Leaves and motes tile a box around the player the same way the grass does, so they are always close by.

/** Shared lighting for the small lit particles: sun (Lambert, both faces) + sky ambient + light through thin leaves. */
const lighting = `uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uAmbient;
vec3 lit(vec3 albedo, vec3 n, vec3 view) {
  float diffuse = abs(dot(n, uSunDir));
  float through = pow(max(dot(-view, uSunDir), 0.0), 6.0);
  return albedo * (uAmbient + uSunColor * (diffuse * 0.8 + through * 0.9));
}`
type LightUniforms = ReturnType<typeof lightUniforms>
const lightUniforms = () => ({ uSunDir: { value: new Vector3(0, 1, 0) }, uSunColor: { value: new Color() }, uAmbient: { value: new Color() } })
/** Updates uniforms created by lightUniforms() (spread into a material, so the same objects). */
function updateLight(u: LightUniforms) {
  const p = atmosphere.preset
  u.uSunDir.value.copy(atmosphere.sunDirection)
  u.uSunColor.value.setHex(p.sun).multiplyScalar(p.sunIntensity * 0.32)
  u.uAmbient.value.setHex(p.hemiSky).multiplyScalar(p.hemiIntensity * 0.35)
}

// ---- Falling leaves -------------------------------------------------------------------------------------------------
const LEAF_RADIUS = 22, LEAF_FALL = 15, LEAVES = 220
const leafVertex = `uniform float uTime; uniform vec3 uCenter; uniform float uRadius; uniform float uScale;
attribute vec4 aLeaf; // xz slot, phase, random
varying vec2 vUv; varying vec3 vNormal; varying vec3 vView; varying float vTint;
vec3 rotate(vec3 v, vec3 k, float a) { return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a)); }
void main() {
  float span = 2.0 * uRadius;
  vec2 slot = aLeaf.xy + span * floor((uCenter.xz - aLeaf.xy) / span + 0.5);
  float speed = 0.55 + 0.45 * aLeaf.w, fall = mod(uTime * speed + aLeaf.z * ${LEAF_FALL.toFixed(1)}, ${LEAF_FALL.toFixed(1)});
  // Leaves sway side to side as they fall and drift with the wind.
  vec2 sway = vec2(sin(uTime * 1.3 + aLeaf.z * 17.0), cos(uTime * 1.1 + aLeaf.w * 13.0)) * 0.6 + vec2(0.6, 0.3) * fall * 0.18;
  vec3 centre = vec3(slot.x + sway.x, uCenter.y + ${(LEAF_FALL - 2).toFixed(1)} - fall, slot.y + sway.y);
  vec3 axis = normalize(vec3(aLeaf.w - 0.5, 0.6, aLeaf.z - 0.5));
  float spin = uTime * (1.2 + 2.2 * aLeaf.w) + aLeaf.z * 40.0;
  float near = 1.0 - smoothstep(uRadius * 0.6, uRadius, distance(slot, uCenter.xz));
  vec3 local = rotate(vec3(position.x, 0.0, position.y) * uScale * near * (0.8 + 0.5 * aLeaf.w), axis, spin);
  vNormal = rotate(vec3(0.0, 1.0, 0.0), axis, spin);
  vec3 world = centre + local;
  vView = normalize(world - cameraPosition);
  vUv = uv; vTint = aLeaf.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`
const leafFragment = `${lighting}
varying vec2 vUv; varying vec3 vNormal; varying vec3 vView; varying float vTint;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  // Pointed oval leaf with a faint midrib.
  if (abs(p.x) > (1.0 - p.y * p.y) * 0.55) discard;
  vec3 albedo = mix(mix(vec3(0.42, 0.5, 0.16), vec3(0.78, 0.55, 0.16), smoothstep(0.3, 0.6, vTint)), vec3(0.62, 0.3, 0.1), smoothstep(0.75, 0.95, vTint));
  albedo *= 0.85 + 0.15 * smoothstep(0.0, 0.08, abs(p.x));
  gl_FragColor = vec4(lit(albedo, vNormal, vView), 1.0);
  #include <colorspace_fragment>
}`

function Leaves() {
  const { mesh, material, light } = useMemo(() => {
    const geometry = new InstancedBufferGeometry(), light = lightUniforms()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3))
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    const rand = random(411), data = new Float32Array(LEAVES * 4)
    for (let i = 0; i < LEAVES; i++) data.set([(rand() * 2 - 1) * LEAF_RADIUS, (rand() * 2 - 1) * LEAF_RADIUS, rand(), rand()], i * 4)
    geometry.setAttribute('aLeaf', new InstancedBufferAttribute(data, 4))
    geometry.instanceCount = LEAVES
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCenter: { value: new Vector3() }, uRadius: { value: LEAF_RADIUS }, uScale: { value: 0.07 }, ...light },
      vertexShader: leafVertex, fragmentShader: leafFragment, side: DoubleSide,
    })
    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false
    return { mesh, material, light }
  }, [])
  useEffect(() => () => { mesh.geometry.dispose(); material.dispose() }, [mesh, material])
  useFrame(({ clock }) => {
    const u = material.uniforms, player = trailTarget.position
    u.uTime.value = clock.elapsedTime
    u.uCenter.value.set(player.x, heightAt(player.x, player.z), player.z)
    // Fewer leaves in the open wetland, and fewer at twilight.
    u.uScale.value = 0.07 * (1 - 0.6 * atmosphere.wetland) * (1 - 0.4 * atmosphere.blend)
    updateLight(light)
  })
  return <primitive object={mesh}/>
}

// ---- Dust motes -----------------------------------------------------------------------------------------------------
const MOTE_RADIUS = 9, MOTES = 260
const moteVertex = `uniform float uTime; uniform vec3 uCenter; uniform float uSize; attribute vec4 aMote; varying float vTwinkle;
void main() {
  float span = ${(2 * MOTE_RADIUS).toFixed(1)};
  vec3 p = vec3(aMote.x, 0.0, aMote.y);
  p.xz += span * floor((uCenter.xz - p.xz) / span + 0.5);
  p += vec3(sin(uTime * 0.21 + aMote.z * 30.0), 0.0, cos(uTime * 0.17 + aMote.w * 30.0)) * 0.8;
  p.y = uCenter.y + 0.3 + mod(aMote.z * 5.0 + uTime * (0.05 + 0.08 * aMote.w), 5.0);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vTwinkle = (0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * (0.8 + aMote.w * 2.0) + aMote.z * 50.0), 4.0))
    * (1.0 - smoothstep(${(MOTE_RADIUS * 0.55).toFixed(1)}, ${MOTE_RADIUS.toFixed(1)}, distance(p.xz, uCenter.xz)));
  gl_PointSize = uSize / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const moteFragment = `uniform vec3 uColor; varying float vTwinkle;
void main() {
  float d = length(gl_PointCoord - 0.5);
  gl_FragColor = vec4(uColor * smoothstep(0.5, 0.0, d) * vTwinkle, 1.0);
  #include <colorspace_fragment>
}`

function Motes() {
  const dpr = useThree(s => s.viewport.dpr)
  const { points, material } = useMemo(() => {
    const geometry = new BufferGeometry(), rand = random(413), data = new Float32Array(MOTES * 4)
    for (let i = 0; i < MOTES; i++) data.set([(rand() * 2 - 1) * MOTE_RADIUS, (rand() * 2 - 1) * MOTE_RADIUS, rand(), rand()], i * 4)
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(MOTES * 3), 3))
    geometry.setAttribute('aMote', new BufferAttribute(data, 4))
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCenter: { value: new Vector3() }, uSize: { value: 0 }, uColor: { value: new Color() } },
      vertexShader: moteVertex, fragmentShader: moteFragment, blending: AdditiveBlending, transparent: true, depthWrite: false,
    })
    const points = new Points(geometry, material)
    points.frustumCulled = false
    return { points, material }
  }, [])
  useEffect(() => () => { points.geometry.dispose(); material.dispose() }, [points, material])
  useFrame(({ clock }) => {
    const u = material.uniforms, player = trailTarget.position, day = 1 - atmosphere.blend
    points.visible = day > 0.02
    u.uTime.value = clock.elapsedTime
    u.uCenter.value.set(player.x, heightAt(player.x, player.z), player.z)
    u.uSize.value = 9 * dpr
    // Warm sunlit dust by day; it fades out as the fireflies take over at dusk.
    u.uColor.value.setRGB(1, 0.82, 0.55).multiplyScalar(0.55 * day * (1 - 0.5 * atmosphere.wetland))
  })
  return <primitive object={points}/>
}

// ---- Butterflies and dragonflies --------------------------------------------------------------------------------------
interface FlierStyle { speed: number; hover: number; bob: number; flap: number; flapAmp: number; size: number; dart: number; dragonfly: boolean }
const flierVertex = `uniform float uTime; uniform float uSpeed; uniform float uHover; uniform float uBob; uniform float uFlap; uniform float uFlapAmp;
uniform float uSize; uniform float uDart; uniform float uVisible;
attribute vec4 aHome; attribute vec4 aLook; // home xyz + roam; tint rgb + phase
varying vec2 vLocal; varying vec3 vTint; varying vec3 vNormal; varying vec3 vView;
vec3 pathAt(float t) {
  float r = aHome.w, ph = aLook.w * 60.0;
  // Wandering loops; the dart term makes dragonflies hold still, then zip to a new spot.
  float hop = floor(t * uDart + ph), k = smoothstep(0.75, 1.0, fract(t * uDart + ph));
  vec2 jump = mix(vec2(sin(hop * 12.9), cos(hop * 7.3)), vec2(sin((hop + 1.0) * 12.9), cos((hop + 1.0) * 7.3)), k) * r * 0.6 * step(0.001, uDart);
  vec2 loop = vec2(sin(t * 0.37 + ph) + 0.35 * sin(t * 0.93 + ph * 2.0), cos(t * 0.29 + ph) + 0.35 * cos(t * 0.81 + ph * 3.0)) * r * (1.0 - 0.7 * step(0.001, uDart));
  return vec3(aHome.x + loop.x + jump.x, aHome.y + uHover + sin(t * 1.7 + ph) * uBob, aHome.z + loop.y + jump.y);
}
void main() {
  float t = uTime * uSpeed;
  vec3 c = pathAt(t), ahead = pathAt(t + 0.08);
  vec2 dir = ahead.xz - c.xz; float heading = atan(dir.x, dir.y);
  // Wings hinge on the body axis (local z): each half lifts by the flap angle.
  float flap = uFlapAmp * sin(uTime * uFlap + aLook.w * 40.0) + 0.2;
  float side = sign(position.x);
  vec3 p = vec3(position.x * cos(flap), abs(position.x) * sin(flap), position.y) * uSize * uVisible;
  vNormal = normalize(vec3(-side * sin(flap), cos(flap), 0.0));
  float ch = cos(heading), sh = sin(heading);
  p = vec3(p.x * ch + p.z * sh, p.y, -p.x * sh + p.z * ch);
  vNormal = vec3(vNormal.x * ch, vNormal.y, -vNormal.x * sh);
  vec3 world = c + p;
  vView = normalize(world - cameraPosition);
  vLocal = position.xy; vTint = aLook.rgb;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`
const flierFragment = `${lighting}
uniform float uDragonfly; varying vec2 vLocal; varying vec3 vTint; varying vec3 vNormal; varying vec3 vView;
float blob(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return 1.0 - dot(d, d); }
void main() {
  vec2 p = vec2(abs(vLocal.x), vLocal.y);
  float body = step(p.x, 0.05) * step(-0.75, p.y) * step(p.y, 0.4);
  float wings;
  vec3 albedo;
  if (uDragonfly > 0.5) {
    body = step(p.x, 0.04) * step(-1.0, p.y) * step(p.y, 0.3);
    wings = max(blob(p, vec2(0.5, 0.12), vec2(0.5, 0.09)), blob(p, vec2(0.45, -0.08), vec2(0.45, 0.08)));
    albedo = mix(vec3(0.75, 0.85, 0.9), vTint, body);
  } else {
    float fore = blob(p, vec2(0.5, 0.18), vec2(0.5, 0.38)), hind = blob(p, vec2(0.38, -0.3), vec2(0.36, 0.3));
    wings = max(fore, hind);
    // Pale wing with a darker rim and a light eye spot.
    float rim = 1.0 - smoothstep(0.0, 0.35, max(fore, hind));
    albedo = mix(vTint, vTint * 0.35, rim);
    albedo = mix(albedo, vec3(0.95, 0.92, 0.82), smoothstep(0.75, 0.95, blob(p, vec2(0.6, 0.25), vec2(0.14, 0.14))));
    albedo = mix(albedo, vec3(0.12, 0.09, 0.07), body);
  }
  if (max(wings, body) <= 0.0) discard;
  gl_FragColor = vec4(lit(albedo, vNormal, vView), 1.0);
  #include <colorspace_fragment>
}`

function Fliers({ homes, style, tints, seed }: { homes: Home[]; style: FlierStyle; tints: number[]; seed: number }) {
  const { mesh, material, light } = useMemo(() => {
    const geometry = new InstancedBufferGeometry(), light = lightUniforms()
    // Two wing quads hinged on the body axis (local z, stored in position.y), x in [-1, 1].
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 0, -1, 0, 0, 1, 0, -1, 1, 0, 0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
    const rand = random(seed), home = new Float32Array(homes.length * 4), look = new Float32Array(homes.length * 4), tint = new Color()
    homes.forEach((h, i) => {
      tint.setHex(tints[Math.floor(rand() * tints.length)])
      home.set([h.x, h.y, h.z, h.roam], i * 4); look.set([tint.r, tint.g, tint.b, rand()], i * 4)
    })
    geometry.setAttribute('aHome', new InstancedBufferAttribute(home, 4))
    geometry.setAttribute('aLook', new InstancedBufferAttribute(look, 4))
    geometry.instanceCount = homes.length
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uSpeed: { value: style.speed }, uHover: { value: style.hover }, uBob: { value: style.bob }, uFlap: { value: style.flap },
        uFlapAmp: { value: style.flapAmp }, uSize: { value: style.size }, uDart: { value: style.dart }, uVisible: { value: 1 },
        uDragonfly: { value: style.dragonfly ? 1 : 0 }, ...light,
      },
      vertexShader: flierVertex, fragmentShader: flierFragment, side: DoubleSide,
    })
    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false // positions come from the shader
    return { mesh, material, light }
  }, [homes, style, tints, seed])
  useEffect(() => () => { mesh.geometry.dispose(); material.dispose() }, [mesh, material])
  useFrame(({ clock }) => {
    const u = material.uniforms, day = 1 - atmosphere.blend
    // Day creatures: they shrink away at dusk (and cost no draw call once gone).
    mesh.visible = day > 0.02
    u.uTime.value = clock.elapsedTime
    u.uVisible.value = Math.min(1, day * 1.5)
    updateLight(light)
  })
  return <primitive object={mesh}/>
}

const BUTTERFLY: FlierStyle = { speed: 1, hover: 0.9, bob: 0.35, flap: 14, flapAmp: 0.9, size: 0.16, dart: 0, dragonfly: false }
const DRAGONFLY: FlierStyle = { speed: 1, hover: 0.55, bob: 0.08, flap: 60, flapAmp: 0.35, size: 0.14, dart: 0.45, dragonfly: true }
const BUTTERFLY_TINTS = [0xf2e3b8, 0xf0b24a, 0xa9c6e8, 0xf5f0e6, 0xe8955a]
const DRAGONFLY_TINTS = [0x2f7d8a, 0x3b6fb0, 0x5a8a3a]

export function AmbientLife() {
  const butterflies = useMemo(() => butterflyHomes(), []), dragonflies = useMemo(() => dragonflyHomes(), [])
  return <><Leaves/><Motes/>
    <Fliers homes={butterflies} style={BUTTERFLY} tints={BUTTERFLY_TINTS} seed={421}/>
    <Fliers homes={dragonflies} style={DRAGONFLY} tints={DRAGONFLY_TINTS} seed={423}/>
    <Suspense fallback={null}><Wildlife/></Suspense>
  </>
}
