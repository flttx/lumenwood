import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector2, Vector3 } from 'three'
import { atmosphere } from './timeOfDay'
import { wind } from './wind'
import { reflectionSkips } from './planarReflection'
import { random } from '../shared/random'
import { heightAt, paths, rolling } from '../world/terrain/terrain'
import { pools } from '../world/zones/wetlandLayout'
import { CAMP, HIGHLAND } from '../world/regions'
// Air effects from the concept art (scene upgrade): shafts of light falling through the canopy over trails and clearings,
// and low mist lying over the wetland pools and the camp's hollows. Code effects (no assets), one draw call each, no scene
// fog on them (they fade with distance in the shader instead, so far quads never show as slabs).
const SHAFT_HEIGHT = 26, SHAFT_WIDTH = 2.5, SHAFT_LEAN = 0.32
const shaftVertex = `varying vec2 vUv; varying float vFade;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  float d = -mv.z;
  vFade = smoothstep(4.0, 12.0, d) * (1.0 - smoothstep(70.0, 120.0, d));
  gl_Position = projectionMatrix * mv;
}`
const shaftFragment = `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying vec2 vUv; varying float vFade;
void main() {
  float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
  float fall = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  float threads = 0.55 + 0.45 * pow(0.5 + 0.5 * sin(vUv.x * 37.0 + sin(vUv.y * 6.0) * 1.2), 2.0);
  float shimmer = (0.8 + 0.2 * sin(vUv.y * 9.0 - uTime * 0.6 + vUv.x * 4.0)) * threads;
  gl_FragColor = vec4(uColor * edge * fall * shimmer * uOpacity * vFade, 1.0);
  #include <colorspace_fragment>
}`
const mistVertex = `varying vec2 vUv; varying float vFade; varying float vSeed;
void main() {
  vUv = uv;
  vSeed = float(gl_InstanceID) * 1.37;
  vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
  vFade = smoothstep(3.0, 10.0, -centre.z) * (1.0 - smoothstep(60.0, 110.0, -centre.z));
  gl_Position = projectionMatrix * (centre + vec4(position.xy * size, 0.0, 0.0));
}`
const mistFragment = `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform vec2 uWindDir; uniform float uWindGust;
varying vec2 vUv; varying float vFade; varying float vSeed;
float mHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mHash(i), mHash(i + vec2(1, 0)), f.x), mix(mHash(i + vec2(0, 1)), mHash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = (vUv - 0.5) * vec2(2.0, 2.0);
  vec2 flow = uWindDir * (uTime * (0.06 + 0.08 * uWindGust)) + vec2(vSeed);
  float n = mNoise(vUv * 3.8 + flow) * 0.65 + mNoise(vUv * 8.2 - flow * 1.4 + 3.1) * 0.35;
  float radial = max(0.0, 1.0 - length(p * vec2(0.95, 1.45)));
  float wisp = smoothstep(0.18, 0.85, radial * (0.72 + 0.55 * n));
  gl_FragColor = vec4(uColor, uOpacity * wisp * wisp * vFade);
  #include <colorspace_fragment>
}`

/** Shaft bases: along every trail at intervals, plus the camp's clearings; deterministic. */
function shaftSpots() {
  const rand = random(301), out: { x: number; y: number; z: number; phase: number }[] = []
  for (const path of paths) for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i], length = Math.hypot(bx - ax, bz - az)
    for (let s = rand() * 10; s < length; s += 18 + rand() * 14) {
      const t = s / length, x = ax + (bx - ax) * t + (rand() - 0.5) * 5, z = az + (bz - az) * t + (rand() - 0.5) * 5
      out.push({ x, y: heightAt(x, z), z, phase: rand() * 6.28 })
    }
  }
  return out
}
/** Mist puffs: several over each wetland pool, and over hollows in the camp and highlands. */
function mistSpots() {
  const rand = random(303), out: { x: number; y: number; z: number; size: number }[] = []
  for (const p of pools) for (let n = 0; n < Math.max(2, Math.round(p.r / 3)); n++) {
    const a = rand() * 6.28, d = rand() * p.r * 0.8, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d
    out.push({ x, y: 0.5 + rand() * 0.6, z, size: 7 + rand() * 6 })
  }
  for (const area of [CAMP, HIGHLAND]) for (let tries = 0, placed = 0; placed < 30 && tries < 600; tries++) {
    const x = area.minX + rand() * (area.maxX - area.minX), z = area.minZ + rand() * (area.maxZ - area.minZ)
    if (rolling(x, z) > -0.35) continue // only in hollows
    out.push({ x, y: heightAt(x, z) + 0.5 + rand() * 0.5, z, size: 8 + rand() * 6 }); placed++
  }
  return out
}

export function AirEffects() {
  const parts = useMemo(() => {
    const shafts = shaftSpots(), mist = mistSpots()
    const shaftMaterial = new ShaderMaterial({ uniforms: { uColor: { value: new Color() }, uOpacity: { value: 0 }, uTime: { value: 0 } }, vertexShader: shaftVertex, fragmentShader: shaftFragment, transparent: true, depthWrite: false, blending: AdditiveBlending })
    const shaftMesh = new InstancedMesh(new PlaneGeometry(SHAFT_WIDTH, SHAFT_HEIGHT).translate(0, SHAFT_HEIGHT / 2, 0), shaftMaterial, shafts.length)
    shaftMesh.frustumCulled = false
    const mistMaterial = new ShaderMaterial({ uniforms: { uColor: { value: new Color() }, uOpacity: { value: 0 }, uTime: { value: 0 }, uWindDir: { value: new Vector2(0.86, 0.5) }, uWindGust: { value: 0.4 } }, vertexShader: mistVertex, fragmentShader: mistFragment, transparent: true, depthWrite: false })
    const mistMesh = new InstancedMesh(new PlaneGeometry(1, 1), mistMaterial, mist.length)
    mistMesh.frustumCulled = false
    const m = new Matrix4(), q = new Quaternion(), s = new Vector3()
    mist.forEach((p, i) => mistMesh.setMatrixAt(i, m.compose(new Vector3(p.x, p.y, p.z), q.identity(), s.set(p.size, p.size * 0.28, 1))))
    return { shafts, shaftMesh, shaftMaterial, mistMesh, mistMaterial }
  }, [])
  useEffect(() => {
    reflectionSkips.add(parts.shaftMesh); reflectionSkips.add(parts.mistMesh)
    return () => {
      reflectionSkips.delete(parts.shaftMesh); reflectionSkips.delete(parts.mistMesh)
      parts.shaftMesh.geometry.dispose(); parts.shaftMaterial.dispose(); parts.shaftMesh.dispose()
      parts.mistMesh.geometry.dispose(); parts.mistMaterial.dispose(); parts.mistMesh.dispose()
    }
  }, [parts])
  const scratch = useMemo(() => ({ m: new Matrix4(), yaw: new Quaternion(), lean: new Quaternion(), pos: new Vector3(), one: new Vector3(1, 1, 1), up: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1), day: new Color(0xffe2a6), dusk: new Color(0x9fb2e0), white: new Color(0xffffff) }), [])
  useFrame(({ camera, clock }) => {
    const { shafts, shaftMesh, shaftMaterial, mistMaterial } = parts, p = atmosphere.preset, dusk = atmosphere.blend
    // Canopy sunbeams belong to daytime/golden hour only; fade completely to 0 at night so no diagonal stripes cross the night sky.
    const shaftOpacity = (0.18 - 0.14 * dusk) * Math.max(0, 1 - atmosphere.night * 1.4) * (1 - 0.5 * atmosphere.wetland)
    shaftMesh.visible = shaftOpacity > 0.004
    if (shaftMesh.visible) {
      shafts.forEach((shaft, i) => {
        const angle = Math.atan2(camera.position.x - shaft.x, camera.position.z - shaft.z)
        scratch.yaw.setFromAxisAngle(scratch.up, angle)
        scratch.lean.setFromAxisAngle(scratch.z, SHAFT_LEAN * Math.sin(p.sunAzimuth - angle + Math.PI / 2))
        shaftMesh.setMatrixAt(i, scratch.m.compose(scratch.pos.set(shaft.x, shaft.y, shaft.z), scratch.yaw.multiply(scratch.lean), scratch.one))
      })
      shaftMesh.instanceMatrix.needsUpdate = true
      shaftMaterial.uniforms.uTime.value = clock.elapsedTime
      shaftMaterial.uniforms.uColor.value.copy(scratch.day).lerp(scratch.dusk, dusk)
      shaftMaterial.uniforms.uOpacity.value = shaftOpacity
    }
    // Mist takes the fog colour, lightened, and thickens in the wetlands and at twilight.
    mistMaterial.uniforms.uTime.value = clock.elapsedTime
    mistMaterial.uniforms.uWindDir.value.set(wind.dirX, wind.dirZ)
    mistMaterial.uniforms.uWindGust.value = wind.gust
    mistMaterial.uniforms.uColor.value.setHex(p.fog).lerp(scratch.white, 0.12)
    mistMaterial.uniforms.uOpacity.value = 0.065 + 0.145 * atmosphere.wetland + 0.13 * dusk
  })
  return <><primitive object={parts.shaftMesh}/><primitive object={parts.mistMesh}/></>
}
