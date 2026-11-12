import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, Color, DataTexture, DoubleSide, FloatType, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NearestFilter, RGBAFormat, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3, Vector4 } from 'three'
import { useGameStore } from '../../state/gameStore'
import { random } from '../shared/random'
import { atmosphere } from './timeOfDay'
import { qualitySettings } from './config'
import { bakeGrassField } from './grassField'
import { grassClearings } from '../world/zones/sceneryLayout'
// Code-generated grass (user decision 2026-11-12: grass may be code, as terrain detail). A fixed set of blades tiles a
// square around the camera: each blade wraps to the copy of its slot nearest the camera, so the patch follows the player
// with no CPU work per frame. Height and density come from a baked field (grassField.ts); wind bends the tips.
const RADIUS = 30, SEGMENTS = 3
const BASE = new Color(0x27401f), TIP = new Color(0x7a9748), TIP_DRY = new Color(0xa49a58)

/** One blade: a strip of SEGMENTS quads, x in [-0.5, 0.5], y in [0, 1]; the shader tapers, bends and places it. */
function bladeGeometry(count: number) {
  const positions: number[] = [], index: number[] = []
  for (let s = 0; s <= SEGMENTS; s++) { const y = s / SEGMENTS; positions.push(-0.5, y, 0, 0.5, y, 0) }
  for (let s = 0; s < SEGMENTS; s++) { const a = s * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(index)
  const rand = random(19), data = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) data.set([(rand() * 2 - 1) * RADIUS, (rand() * 2 - 1) * RADIUS, rand(), rand()], i * 4)
  geometry.setAttribute('aBlade', new InstancedBufferAttribute(data, 4))
  geometry.instanceCount = count
  return geometry
}

const vertexShader = `uniform vec3 uCamera; uniform float uRadius; uniform float uTime; uniform sampler2D uField; uniform vec4 uFieldRect; uniform vec2 uFieldSize;
attribute vec4 aBlade; // xy slot offset, z random, w random
varying float vT; varying float vShade; varying float vDry;
#include <fog_pars_vertex>
vec2 fieldAt(vec2 p) {
  vec2 uv = (p - uFieldRect.xy) / uFieldRect.zw * (uFieldSize - 1.0);
  vec2 i = floor(uv), f = uv - i;
  vec2 t = 1.0 / uFieldSize;
  vec2 a = texture2D(uField, (i + 0.5) * t).rg, b = texture2D(uField, (i + vec2(1.5, 0.5)) * t).rg;
  vec2 c = texture2D(uField, (i + vec2(0.5, 1.5)) * t).rg, d = texture2D(uField, (i + 1.5) * t).rg;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  float span = 2.0 * uRadius;
  vec2 p = aBlade.xy + span * floor((uCamera.xz - aBlade.xy) / span + 0.5);
  vec2 field = fieldAt(p);
  float fade = 1.0 - smoothstep(uRadius * 0.65, uRadius, distance(p, uCamera.xz));
  float keep = step(aBlade.z, field.y) * fade;
  float height = (0.16 + 0.32 * aBlade.w) * keep;
  float t = position.y;
  float angle = aBlade.z * 31.4 + aBlade.w * 7.0;
  vec2 side = vec2(cos(angle), sin(angle));
  float width = 0.095 * (1.0 - t * 0.85) * keep;
  float gust = sin(uTime * 1.7 + p.x * 0.35 + p.y * 0.21) * 0.6 + sin(uTime * 3.1 + p.x * 1.3) * 0.25;
  vec2 bend = (vec2(0.8, 0.45) * gust + side.yx * (aBlade.w - 0.5) * 0.6) * t * t * height * 0.45;
  vec3 world = vec3(p.x + side.x * position.x * width + bend.x, field.x + t * height, p.y + side.y * position.x * width + bend.y);
  vT = t; vShade = 0.75 + 0.25 * aBlade.w; vDry = aBlade.z;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const fragmentShader = `uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uTipDry; uniform vec3 uLight;
varying float vT; varying float vShade; varying float vDry;
#include <fog_pars_fragment>
void main() {
  vec3 tip = mix(uTip, uTipDry, smoothstep(0.88, 1.0, vDry));
  vec3 color = mix(uBase, tip, smoothstep(0.0, 1.0, vT)) * uLight * vShade;
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

export function Grass() {
  const blades = useGameStore(s => qualitySettings[s.quality].grassBlades)
  const { mesh, uniforms, texture } = useMemo(() => {
    const field = bakeGrassField(grassClearings)
    const texture = new DataTexture(field.data, field.width, field.depth, RGBAFormat, FloatType)
    texture.magFilter = texture.minFilter = NearestFilter; texture.needsUpdate = true
    const geometry = bladeGeometry(blades)
    const uniforms = UniformsUtils.merge([UniformsLib.fog, {
      uCamera: { value: new Vector3() }, uRadius: { value: RADIUS }, uTime: { value: 0 }, uField: { value: null },
      uFieldRect: { value: new Vector4(field.minX, field.minZ, (field.width - 1) * field.cell, (field.depth - 1) * field.cell) },
      uFieldSize: { value: new Vector2(field.width, field.depth) },
      uBase: { value: BASE.clone() }, uTip: { value: TIP.clone() }, uTipDry: { value: TIP_DRY.clone() }, uLight: { value: new Color(1, 1, 1) },
    }])
    uniforms.uField.value = texture
    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: DoubleSide, fog: true })
    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false // the patch always surrounds the camera
    mesh.receiveShadow = false
    return { mesh, uniforms, texture }
  }, [blades])
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as ShaderMaterial).dispose(); texture.dispose() }, [mesh, texture])
  const scratch = useMemo(() => ({ sky: new Color(), sun: new Color() }), [])
  useFrame(({ camera, clock }) => {
    uniforms.uCamera.value.copy(camera.position)
    uniforms.uTime.value = clock.elapsedTime
    // Unlit shading follows the scene's sky and sun so the grass sits in the same light as the lit ground under it.
    const p = atmosphere.preset
    scratch.sky.setHex(p.hemiSky).multiplyScalar(0.35 * p.hemiIntensity)
    scratch.sun.setHex(p.sun).multiplyScalar(0.28 * p.sunIntensity)
    uniforms.uLight.value.copy(scratch.sky).add(scratch.sun)
  })
  return <primitive object={mesh}/>
}
