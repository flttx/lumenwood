import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, DepthTexture, HalfFloatType, Vector2, WebGLRenderTarget, type PerspectiveCamera } from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { useGameStore } from '../../state/gameStore'
import { atmosphere } from './timeOfDay'
import { AtmospherePass } from './AtmospherePass'
import { reviveCircles } from '../features/route/revive'
import { route, routeClock } from '../features/route/progress'
import { trailTarget } from './Grass'
import { captureCanvasPhoto, photoCapture } from './photo'
// Screen pipeline:
// 1. Render 3D scene once into `sceneTarget` (HalfFloat + DepthTexture; 4× MSAA on medium/high, 0× on low).
// 2. High quality only: depth-only half-res GTAOPass (`setGBuffer(sceneTarget.depthTexture)`) — eliminates the old
//    full-scene normal GBuffer re-render (~230 draw calls & ~2.5M tris/frame) and respects camera-faded foliage & surf.
// 3. AtmospherePass (height mist, jittered half-res god rays, colour restoration, NaN scrub).
// 4. Medium/high: UnrealBloomPass (skipped & unallocated on low).
// 5. OutputPass (ACES Filmic tone mapping + sRGB) → GradeShader (split toning, contrast, saturation, vignette, grain).
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uShade: { value: new Color() }, uLight: { value: new Color() },
    uContrast: { value: 1 }, uSaturation: { value: 1 }, uVignette: { value: 0 }, uAspect: { value: 1 }, uTime: { value: 0 }, uGrain: { value: 0.012 },
  },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec3 uShade; uniform vec3 uLight; uniform float uContrast; uniform float uSaturation;
uniform float uVignette; uniform float uAspect; uniform float uTime; uniform float uGrain; varying vec2 vUv;
vec3 softLight(vec3 a, vec3 b) {
  vec3 safeA = max(a, vec3(0.0));
  return mix(safeA - (1.0 - 2.0 * b) * safeA * (1.0 - safeA), safeA + (2.0 * b - 1.0) * (sqrt(safeA) - safeA), step(0.5, b));
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
  // Film grain, strongest in the mid-tones.
  float phase = mod(uTime, 97.0) * 0.73;
  float n = fract(sin(dot(vUv * vec2(1693.0, 977.0) + phase, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += n * uGrain * (1.0 - abs(grey - 0.5) * 1.4);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,
}

/** How faded the not-yet-restored world is (0 none, 1 fully): subtle in daylight so the opening forest stays vibrant. */
const FADED = 0.34
const MIN_POST_DIM = 64

export function PostFX() {
  const { gl, scene, camera, size, viewport } = useThree()
  const quality = useGameStore(s => s.quality)
  const bloomOn = quality !== 'low'
  const aoOn = quality === 'high'
  const fxTime = useRef(0)

  const fx = useMemo(() => {
    const depthTexture = new DepthTexture(1, 1)
    const sceneTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: quality === 'low' ? 0 : 4, depthTexture })
    // Ping-pong buffers hold fullscreen post results only: no MSAA resolve overhead and no redundant depth buffers.
    const rtA = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false })
    const rtB = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false })
    const air = new AtmospherePass(camera as PerspectiveCamera)
    let ao: GTAOPass | null = null
    if (aoOn) {
      ao = new GTAOPass(scene, camera, 1, 1, { depthTexture })
      ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.5, thickness: 1.5, scale: 1.1, samples: 12 })
      ao.updatePdMaterial({ radius: 6, samples: 12 })
      ao.blendIntensity = 0.78
      ao.renderToScreen = false
    }
    const bloom = bloomOn ? new UnrealBloomPass(new Vector2(256, 256), 0.5, 0.65, 0.85) : null
    if (bloom) bloom.renderToScreen = false
    const output = new OutputPass()
    output.renderToScreen = false
    const grade = new ShaderPass(GradeShader)
    grade.renderToScreen = true
    return { sceneTarget, rtA, rtB, air, ao, bloom, output, grade }
  }, [scene, camera, quality, aoOn, bloomOn])

  useEffect(() => {
    // Clamp pixel dimensions to >= 64 so UnrealBloomPass's 5 mip halvings never divide by zero on collapsed windows.
    const dpr = Math.max(0.5, viewport.dpr || gl.getPixelRatio() || 1)
    const w = Math.max(MIN_POST_DIM, Math.round(size.width * dpr))
    const h = Math.max(MIN_POST_DIM, Math.round(size.height * dpr))
    fx.sceneTarget.setSize(w, h)
    fx.rtA.setSize(w, h)
    fx.rtB.setSize(w, h)
    fx.air.setSize(w, h)
    // Half-resolution depth-only GTAO cuts AO fragment cost 4× while Poisson denoise preserves smooth contact grounding.
    fx.ao?.setSize(Math.max(32, Math.round(w * 0.5)), Math.max(32, Math.round(h * 0.5)))
    fx.bloom?.setSize(w, h)
    fx.output.setSize(w, h)
    fx.grade.setSize(w, h)
  }, [fx, gl, size.width, size.height, viewport.dpr])

  // Several passes render each frame; count the whole frame for the debug stats instead of the last full-screen pass.
  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
      fx.sceneTarget.depthTexture?.dispose()
      fx.sceneTarget.dispose()
      fx.rtA.dispose()
      fx.rtB.dispose()
      fx.air.dispose()
      fx.ao?.dispose()
      fx.bloom?.dispose()
      fx.output.dispose()
      fx.grade.dispose()
    }
  }, [fx, gl])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    if (useGameStore.getState().phase === 'playing') fxTime.current += dt
    const p = atmosphere.preset, u = fx.grade.uniforms
    if (fx.bloom) { fx.bloom.strength = p.bloom; fx.bloom.threshold = p.bloomThreshold }
    const air = fx.air.settings
    air.mist = p.mist; air.falloff = p.mistFalloff; air.mistBase = trailTarget.position.y - 1.2
    air.rays = p.rays; air.raysOn = bloomOn
    air.depthTexture = fx.sceneTarget.depthTexture
    const revived = reviveCircles(route, routeClock.now, air.revive)
    air.reviveCount = revived.count; air.reviveAll = revived.all; air.faded = 0.1 + (FADED - 0.1) * atmosphere.blend
    // Cloud shadows only where the sun is strong enough to cast them.
    air.cloud = 0.28 * Math.min(1, p.sunIntensity / 4.2) * (1 - atmosphere.blend); air.time = fxTime.current
    air.mistColor.setHex(p.fog)
    air.sunColor.setHex(p.sun).multiplyScalar(Math.min(1, p.sunIntensity / 4.2)); air.sunDir.copy(atmosphere.sunDirection)
    u.uShade.value.setHex(p.shadeTint); u.uLight.value.setHex(p.lightTint)
    u.uContrast.value = p.contrast; u.uSaturation.value = p.saturation; u.uVignette.value = p.vignette
    u.uAspect.value = size.width / Math.max(1, size.height); u.uTime.value = fxTime.current

    gl.info.reset()
    // 1. Primary 3D render into sceneTarget (sceneTarget is read-only in all downstream passes — no feedback loops).
    gl.setRenderTarget(fx.sceneTarget)
    gl.clear()
    gl.render(scene, camera)

    let current = fx.sceneTarget
    let write = fx.rtA
    const nextWrite = () => (current === fx.rtA ? fx.rtB : fx.rtA)

    // 2. High-quality depth-only GTAO before atmospheric mist so fog is never darkened at silhouette edges.
    if (fx.ao) {
      fx.ao.render(gl, write, current, dt, false)
      current = write
      write = nextWrite()
    }

    // 3. Depth-aware height mist, god rays, revive colour circles, and NaN guard.
    fx.air.renderToScreen = false
    fx.air.render(gl, write, current)
    current = write
    write = nextWrite()

    // 4. Bloom blends additively onto `current` in place.
    if (fx.bloom) fx.bloom.render(gl, write, current, dt, false)

    // 5. Tone mapping + sRGB conversion into `write`, then final screen grade straight to the canvas.
    fx.output.render(gl, write, current, dt, false)
    current = write
    fx.grade.render(gl, nextWrite(), current, dt, false)
    gl.setRenderTarget(null)
    if (photoCapture.requested) {
      photoCapture.requested = false
      const ok = captureCanvasPhoto(gl.domElement)
      const cb = photoCapture.onResult
      photoCapture.onResult = null
      cb?.(ok)
    }
  }, 1)
  return null
}
