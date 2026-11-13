import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, DataTexture, DoubleSide, FloatType, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshLambertMaterial, NearestFilter, RGBAFormat, ShaderChunk, Vector2, Vector3, Vector4, type WebGLProgramParametersWithUniforms } from 'three'
import { useGameStore } from '../../state/gameStore'
import { random } from '../shared/random'
import { atmosphere } from './timeOfDay'
import { qualitySettings } from './config'
import { bakeGrassField } from './grassField'
import { reflectionSkips } from './planarReflection'
import { grassClearings } from '../world/zones/sceneryLayout'
// Code-generated grass (user decision 2026-11-12: grass may be code, as terrain detail). A fixed set of blades tiles a
// square around the camera: each blade wraps to the copy of its slot nearest the camera, so the patch follows the player
// with no CPU work per frame. Height and density come from a baked field (grassField.ts). The blades use a lit material
// (sun, sky, tree shadows, fog), glow at the tips when backlit by the low sun, sway in the wind, and are pushed down and
// aside by the player: a short trail of recent footsteps fades out, so trampled grass springs back over a couple of seconds.
const RADIUS = 30, SEGMENTS = 3, TRAIL = 8, TRAIL_STEP = 0.35, TRAIL_RECOVER = 1.8
const BASE = new Color(0x223a1a), TIP = new Color(0x84a24a), TIP_DRY = new Color(0xb09f56), TIP_GLOW = new Color(0xffd27a)
/** The grass reads the player's position from here (World wires it once), keeping Grass free of per-frame React props. */
export const trailTarget = { position: new Vector3() }

/** One blade: a strip of SEGMENTS quads, x in [-0.5, 0.5], y in [0, 1]; the shader tapers, bends and places it. */
function bladeGeometry(count: number) {
  const positions: number[] = [], normals: number[] = [], index: number[] = []
  for (let s = 0; s <= SEGMENTS; s++) { const y = s / SEGMENTS; positions.push(-0.5, y, 0, 0.5, y, 0); normals.push(0, 0, 1, 0, 0, 1) }
  for (let s = 0; s < SEGMENTS; s++) { const a = s * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  geometry.setIndex(index)
  const rand = random(19), data = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) data.set([(rand() * 2 - 1) * RADIUS, (rand() * 2 - 1) * RADIUS, rand(), rand()], i * 4)
  geometry.setAttribute('aBlade', new InstancedBufferAttribute(data, 4))
  geometry.instanceCount = count
  return geometry
}

const vertexCommon = `#include <common>
uniform vec3 uCamera; uniform float uRadius; uniform float uTime; uniform sampler2D uField; uniform vec4 uFieldRect; uniform vec2 uFieldSize;
uniform vec4 uTrail[${TRAIL}]; uniform vec3 uSunDir;
attribute vec4 aBlade; // xy slot offset, z random, w random
varying float vT; varying float vShade; varying float vDry; varying float vBack; varying float vPatch;
vec2 fieldAt(vec2 p) {
  vec2 uv = (p - uFieldRect.xy) / uFieldRect.zw * (uFieldSize - 1.0);
  vec2 i = floor(uv), f = uv - i, t = 1.0 / uFieldSize;
  vec2 a = texture2D(uField, (i + 0.5) * t).rg, b = texture2D(uField, (i + vec2(1.5, 0.5)) * t).rg;
  vec2 c = texture2D(uField, (i + vec2(0.5, 1.5)) * t).rg, d = texture2D(uField, (i + 1.5) * t).rg;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`
const vertexBody = `
  float span = 2.0 * uRadius;
  vec2 p = aBlade.xy + span * floor((uCamera.xz - aBlade.xy) / span + 0.5);
  vec2 field = fieldAt(p);
  float fade = 1.0 - smoothstep(uRadius * 0.65, uRadius, distance(p, uCamera.xz));
  float keep = step(aBlade.z, field.y) * fade;
  // Meadow patches: large-scale value noise tints whole areas (sunlit yellow-green to cool blue-green), as in the boards.
  vec2 cell = floor(p * 0.06), fr = fract(p * 0.06); fr = fr * fr * (3.0 - 2.0 * fr);
  float h00 = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5), h10 = fract(sin(dot(cell + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5);
  float h01 = fract(sin(dot(cell + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5), h11 = fract(sin(dot(cell + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5);
  vPatch = mix(mix(h00, h10, fr.x), mix(h01, h11, fr.x), fr.y);
  float height = (0.16 + 0.32 * aBlade.w) * keep;
  float t = position.y;
  float angle = aBlade.z * 31.4 + aBlade.w * 7.0;
  vec2 side = vec2(cos(angle), sin(angle));
  // Trampling: footsteps push blades outward and down; older steps weigh less as the grass springs back.
  vec2 push = vec2(0.0); float flatten = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    vec2 away = p - uTrail[i].xy; float d = length(away);
    float w = uTrail[i].z * (1.0 - smoothstep(0.25, 1.05, d));
    push += (d > 0.001 ? away / d : side) * w; flatten = max(flatten, w);
  }
  float width = 0.11 * (1.0 - t * 0.8) * keep;
  float gust = sin(uTime * 1.7 + p.x * 0.35 + p.y * 0.21) * 0.6 + sin(uTime * 3.1 + p.x * 1.3) * 0.25;
  vec2 bend = (vec2(0.8, 0.45) * gust * (1.0 - flatten) + side.yx * (aBlade.w - 0.5) * 0.6) * t * t * height * 0.45 + push * t * height * 0.85;
  float lift = t * height * (1.0 - 0.6 * flatten);
  vec3 transformed = vec3(p.x + side.x * position.x * width + bend.x, field.x + lift, p.y + side.y * position.x * width + bend.y);
  vT = t; vShade = 0.75 + 0.25 * aBlade.w; vDry = aBlade.z;
  vBack = pow(max(dot(normalize(transformed - cameraPosition), uSunDir), 0.0), 5.0);`
const fragmentCommon = `#include <common>
uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uTipDry; uniform vec3 uTipGlow; uniform float uGlow;
varying float vT; varying float vShade; varying float vDry; varying float vBack; varying float vPatch;
uniform vec3 uPatchWarm; uniform vec3 uPatchCool;`

export function Grass() {
  const blades = useGameStore(s => qualitySettings[s.quality].grassBlades)
  const { mesh, uniforms, texture } = useMemo(() => {
    const field = bakeGrassField(grassClearings)
    const texture = new DataTexture(field.data, field.width, field.depth, RGBAFormat, FloatType)
    texture.magFilter = texture.minFilter = NearestFilter; texture.needsUpdate = true
    const uniforms = {
      uCamera: { value: new Vector3() }, uRadius: { value: RADIUS }, uTime: { value: 0 }, uField: { value: texture },
      uFieldRect: { value: new Vector4(field.minX, field.minZ, (field.width - 1) * field.cell, (field.depth - 1) * field.cell) },
      uFieldSize: { value: new Vector2(field.width, field.depth) },
      uTrail: { value: Array.from({ length: TRAIL }, () => new Vector4(0, 0, 0, 0)) }, uSunDir: { value: new Vector3(0, 1, 0) },
      uBase: { value: BASE.clone() }, uTip: { value: TIP.clone() }, uTipDry: { value: TIP_DRY.clone() }, uTipGlow: { value: TIP_GLOW.clone() }, uGlow: { value: 0 },
      uPatchWarm: { value: new Color(1.12, 1.05, 0.72) }, uPatchCool: { value: new Color(0.78, 0.95, 0.92) },
    }
    const material = new MeshLambertMaterial({ side: DoubleSide })
    material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader.replace('#include <common>', vertexCommon)
        // Normals lean up so blades read as a soft mass rather than flat cards.
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(0.0, 1.0, 0.0) + normal * 0.6);')
        .replace('#include <begin_vertex>', vertexBody)
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', fragmentCommon)
        // Both faces of a blade share the up-leaning normal (no back-face flip), so the side away from the camera is not black.
        .replace('#include <normal_fragment_begin>', ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;'))
        .replace('#include <color_fragment>', 'diffuseColor.rgb = mix(uBase, mix(uTip, uTipDry, smoothstep(0.88, 1.0, vDry)), smoothstep(0.0, 1.0, vT)) * vShade;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uTipGlow * uGlow * vBack * vT * vT;')
    }
    material.customProgramCacheKey = () => 'lumenwood-grass'
    const mesh = new Mesh(bladeGeometry(blades), material)
    mesh.frustumCulled = false // the patch always surrounds the camera
    mesh.userData.noAO = true // blades are placed in the vertex shader; the AO pass's normal render would draw them flat
    mesh.receiveShadow = true
    reflectionSkips.add(mesh) // costly to draw twice, and the shore hides it in the water anyway
    return { mesh, uniforms, texture }
  }, [blades])
  useEffect(() => () => { reflectionSkips.delete(mesh); mesh.geometry.dispose(); (mesh.material as MeshLambertMaterial).dispose(); texture.dispose() }, [mesh, texture])
  const trail = useMemo(() => ({ last: new Vector2(Infinity, Infinity) }), [])
  useFrame(({ camera, clock }, delta) => {
    uniforms.uCamera.value.copy(camera.position)
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uSunDir.value.copy(atmosphere.sunDirection)
    // Backlit tips glow with the low sun; at twilight the sun is weak and so is the glow.
    uniforms.uGlow.value = 0.55 * (atmosphere.preset.sunIntensity / 4.2) * (1 - 0.7 * atmosphere.blend)
    // Trail: slot 0 follows the player; a new footprint is laid every TRAIL_STEP metres and every print fades out.
    const steps = uniforms.uTrail.value, decay = Math.exp(-Math.min(delta, 0.1) / TRAIL_RECOVER), player = trailTarget.position
    for (let i = 1; i < TRAIL; i++) steps[i].z *= decay
    if (Math.hypot(player.x - trail.last.x, player.z - trail.last.y) > TRAIL_STEP) {
      for (let i = TRAIL - 1; i > 1; i--) steps[i].copy(steps[i - 1])
      steps[1].set(player.x, player.z, 1, 0)
      trail.last.set(player.x, player.z)
    }
    steps[0].set(player.x, player.z, 1, 0)
  })
  return <primitive object={mesh}/>
}
