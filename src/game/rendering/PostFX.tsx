import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, HalfFloatType, Vector2, WebGLRenderTarget } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { useGameStore } from '../../state/gameStore'
import { atmosphere } from './timeOfDay'
// Screen pipeline (visual upgrade, 2026-11-12; the user made light and shadow the project's core): the scene renders into
// an HDR multisampled target, bright pixels (sun, glowing flora, lanterns, fireflies) bloom softly, then tone mapping and
// sRGB output, then a display-space grade: split toning (cool shadows, warm highlights), contrast, saturation, vignette.
// Every value comes from the time-of-day preset. Uses only Three.js's own addons (no new dependency).
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uShade: { value: new Color() }, uLight: { value: new Color() },
    uContrast: { value: 1 }, uSaturation: { value: 1 }, uVignette: { value: 0 }, uAspect: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uShade; uniform vec3 uLight; uniform float uContrast; uniform float uSaturation;
uniform float uVignette; uniform float uAspect; varying vec2 vUv;
vec3 softLight(vec3 a, vec3 b) {
  return mix(a - (1.0 - 2.0 * b) * a * (1.0 - a), a + (2.0 * b - 1.0) * (sqrt(a) - a), step(0.5, b));
}
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = mix(uShade, uLight, smoothstep(0.08, 0.8, lum));
  col = mix(col, softLight(col, tint), 0.35);
  col = (col - 0.5) * uContrast + 0.5;
  float grey = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(grey), col, uSaturation);
  vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
  col *= mix(1.0 - uVignette, 1.0, smoothstep(0.95, 0.25, length(v)));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,
}

export function PostFX() {
  const { gl, scene, camera, size } = useThree()
  const bloomOn = useGameStore(s => s.quality !== 'low')
  const fx = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 })
    const composer = new EffectComposer(gl, target)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new Vector2(256, 256), 0.5, 0.65, 0.85)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    const grade = new ShaderPass(GradeShader)
    composer.addPass(grade)
    return { composer, bloom, grade }
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
    fx.bloom.enabled = bloomOn
    fx.bloom.strength = p.bloom; fx.bloom.threshold = p.bloomThreshold
    u.uShade.value.setHex(p.shadeTint); u.uLight.value.setHex(p.lightTint)
    u.uContrast.value = p.contrast; u.uSaturation.value = p.saturation; u.uVignette.value = p.vignette
    u.uAspect.value = size.width / Math.max(1, size.height)
    gl.info.reset()
    fx.composer.render(delta)
  }, 1)
  return null
}
