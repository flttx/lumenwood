import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, HalfFloatType, Material, Mesh, ShaderMaterial, Vector2, WebGLRenderTarget, type Camera, type Object3D, type Scene } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { useGameStore } from '../../state/gameStore'
import { atmosphere } from './timeOfDay'
// Screen pipeline (visual upgrade, 2026-11-12; the user made light and shadow the project's core): the scene renders into
// an HDR multisampled target, bright pixels (sun, glowing flora, lanterns, fireflies) bloom softly, then tone mapping and
// sRGB output, then a display-space grade: split toning (cool shadows, warm highlights), contrast, saturation, vignette.
// Every value comes from the time-of-day preset. Uses only Three.js's own addons (no new dependency).
// 2026-11-12 (cinematic pass): ambient occlusion (GTAO, high quality only) darkens creases and where things meet the
// ground, so trees, rocks and props sit in the world instead of on it; the grade adds a fine animated film grain and a
// slight colour fringe toward the frame edges.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uShade: { value: new Color() }, uLight: { value: new Color() },
    uContrast: { value: 1 }, uSaturation: { value: 1 }, uVignette: { value: 0 }, uAspect: { value: 1 }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uFringe: { value: 0.0018 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uShade; uniform vec3 uLight; uniform float uContrast; uniform float uSaturation;
uniform float uVignette; uniform float uAspect; uniform float uTime; uniform float uGrain; uniform float uFringe; varying vec2 vUv;
vec3 softLight(vec3 a, vec3 b) {
  return mix(a - (1.0 - 2.0 * b) * a * (1.0 - a), a + (2.0 * b - 1.0) * (sqrt(a) - a), step(0.5, b));
}
void main() {
  // Lens fringe: red and blue sampled slightly apart, growing toward the edges.
  vec2 off = (vUv - 0.5) * uFringe * length(vUv - 0.5) * 4.0;
  vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = mix(uShade, uLight, smoothstep(0.08, 0.8, lum));
  col = mix(col, softLight(col, tint), 0.35);
  col = (col - 0.5) * uContrast + 0.5;
  float grey = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(grey), col, uSaturation);
  vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
  col *= mix(1.0 - uVignette, 1.0, smoothstep(0.95, 0.25, length(v)));
  // Film grain, strongest in the mid-tones.
  float n = fract(sin(dot(vUv * vec2(1693.0, 977.0) + fract(uTime) * 61.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += n * uGrain * (1.0 - abs(grey - 0.5) * 1.4);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,
}

/** Keeps out of the AO pass's normal render what would draw wrongly or cast false shadows there: points, sprites,
 *  transparent glows and mist, custom shader effects, and meshes flagged `userData.noAO` (the grass). */
const aoSkips = (o: Object3D) => {
  if (o.userData.noAO === true || (o as { isPoints?: boolean }).isPoints || (o as { isSprite?: boolean }).isSprite || (o as { isLine?: boolean }).isLine) return true
  if (!(o instanceof Mesh)) return false
  const materials: Material[] = Array.isArray(o.material) ? o.material : [o.material]
  return materials.some(m => m.transparent || m instanceof ShaderMaterial)
}
class GroundingAO extends GTAOPass {
  private hidden: Object3D[] = []
  constructor(private readonly root: Scene, camera: Camera) { super(root, camera) }
  _overrideVisibility() { this.root.traverse(o => { if (o.visible && aoSkips(o)) { o.visible = false; this.hidden.push(o) } }) }
  _restoreVisibility() { for (const o of this.hidden) o.visible = true; this.hidden.length = 0 }
}

export function PostFX() {
  const { gl, scene, camera, size } = useThree()
  const bloomOn = useGameStore(s => s.quality !== 'low')
  const aoOn = useGameStore(s => s.quality === 'high')
  const fx = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 })
    const composer = new EffectComposer(gl, target)
    composer.addPass(new RenderPass(scene, camera))
    // Contact shadows at metre scale: a radius that reaches from a trunk's foot into the ground around it.
    const ao = new GroundingAO(scene, camera)
    ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.5, thickness: 1.5, scale: 1.1, samples: 12 })
    ao.updatePdMaterial({ radius: 6, samples: 12 })
    ao.blendIntensity = 0.85
    composer.addPass(ao)
    const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.5, 0.65, 0.85)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    const grade = new ShaderPass(GradeShader)
    composer.addPass(grade)
    return { composer, bloom, grade, ao }
  }, [gl, scene, camera])
  useEffect(() => {
    fx.composer.setPixelRatio(gl.getPixelRatio())
    fx.composer.setSize(size.width, size.height)
  }, [fx, gl, size.width, size.height])
  // Several passes render each frame; count the whole frame for the debug stats instead of the last full-screen pass.
  useEffect(() => {
    gl.info.autoReset = false
    return () => { gl.info.autoReset = true; fx.composer.dispose() }
  }, [fx, gl])
  useFrame((_, delta) => {
    const p = atmosphere.preset, u = fx.grade.uniforms
    fx.bloom.enabled = bloomOn; fx.ao.enabled = aoOn
    fx.bloom.strength = p.bloom; fx.bloom.threshold = p.bloomThreshold
    u.uShade.value.setHex(p.shadeTint); u.uLight.value.setHex(p.lightTint)
    u.uContrast.value = p.contrast; u.uSaturation.value = p.saturation; u.uVignette.value = p.vignette
    u.uAspect.value = size.width / Math.max(1, size.height); u.uTime.value = performance.now() / 1000
    gl.info.reset()
    fx.composer.render(delta)
  }, 1)
  return null
}
