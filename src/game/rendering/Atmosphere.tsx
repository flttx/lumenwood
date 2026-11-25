import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackSide, Color, Fog, Mesh as ThreeMesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, Vector3 as V3, type DirectionalLight, type HemisphereLight, type Mesh, type Vector3, type WebGLRenderTarget } from 'three'
import { useGameStore } from '../../state/gameStore'
import { qualitySettings } from './config'
import { TIME_POINT, applyZoneTint, atmosphere, blendPresets, highlandTints, journeyBlend, presets, wetlandTints } from './timeOfDay'
import { route } from '../features/route/progress'
import { smoothstep } from '../shared/math'
import { sz } from '../world/scale'
import { dampFactor } from '../player/movement'
import { worldUniforms } from './worldMaterial'
import { updateWind, wind } from './wind'
// Sky, fog, IBL environment and lights for the current time of day. Switching eases over a few seconds; all updates
// happen in the frame loop on Three.js objects, never through React state.
// Expanded shadow box (±54 m) covers nearby hillside trees and cliff faces while keeping ~2.6 cm/texel on high quality.
const TRANSITION_RATE = 1.2, JOURNEY_RATE = 0.35, SUN_DISTANCE = 105, SHADOW_EXTENT = 54
// The wetland look fades in along the corridor (z 30 → 40) and eases, so teleports and the gate do not pop.
const WETLAND_FROM = sz(30), WETLAND_FULL = sz(40), ZONE_RATE = 1.5
// The highland look takes over up the ramp (z 84 → 100); the wetland look fades out first so they never stack.
const HIGHLAND_FROM = sz(84), HIGHLAND_FULL = sz(100)
const skyVertex = 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const skyFragment = `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float glow; uniform float night;
uniform vec3 haze; uniform vec3 moonDir; uniform float moon; uniform float aurora; uniform float time; uniform float dusk;
uniform vec3 meteorFrom; uniform vec3 meteorTo; uniform float meteorT;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = rot * p * 2.04 + vec2(17.1, 31.7); a *= 0.5; }
  return v;
}
float cloudField(vec2 p) {
  vec2 warp = vec2(fbm(p * 0.42 + vec2(2.3, 1.7)), fbm(p * 0.42 + vec2(-3.1, 4.9))) - 0.5;
  float base = fbm(p * 0.65 + warp * 0.9);
  float billows = fbm(p * 1.45 - warp * 0.5 + vec2(8.4, -3.2));
  return smoothstep(0.46, 0.82, base * 0.72 + billows * 0.34);
}
// One layer of stars: cells on the direction cube; a few cells hold a star of random brightness, colour and twinkle.
vec3 stars(vec3 dir, float density, float threshold) {
  vec3 cell = floor(dir * density), f = fract(dir * density) - 0.5;
  float h = hash3(cell);
  if (h < threshold) return vec3(0.0);
  vec3 offset = vec3(hash3(cell + 1.3), hash3(cell + 2.7), hash3(cell + 4.1)) - 0.5;
  float d = length(f - offset * 0.65);
  float bright = pow((h - threshold) / (1.0 - threshold), 1.35) * (0.68 + 0.32 * sin(time * (1.4 + h * 3.6) + h * 60.0));
  vec3 tint = mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.88, 0.72), hash3(cell + 9.1));
  return tint * bright * (smoothstep(0.18, 0.0, d) * 2.6 + smoothstep(0.35, 0.0, d) * 0.45);
}
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);
  // Noise is sampled on the horizon circle (not by angle), so there is no seam behind the camera.
  vec2 ring = normalize(dir.xz + vec2(1e-5));
  float toward = max(dot(dir, sunDir), 0.0);
  float sunSide = clamp(dot(ring, normalize(sunDir.xz + vec2(1e-5))) * 0.5 + 0.5, 0.0, 1.0);
  // Three-zone atmospheric scattering: solar warm Mie horizon vs anti-solar cool sky, brisk climb into clear blue zenith.
  vec3 antiHorizon = mix(horizon, mix(top, haze, 0.55), 0.35 + 0.25 * dusk);
  vec3 solarHorizon = mix(horizon, sunColor * 1.08 + horizon * 0.2, (0.28 + 0.45 * dusk) * (1.0 - night));
  vec3 horizCol = mix(antiHorizon, solarHorizon, pow(sunSide, 1.6));
  vec3 midSky = mix(mix(horizCol, top, 0.52), top * 1.15 + vec3(0.04, 0.06, 0.09) * (1.0 - night), 0.45);
  vec3 color = mix(horizCol, midSky, smoothstep(0.0, 0.24, h));
  color = mix(color, top, smoothstep(0.14, 0.82, pow(h, 0.68)));
  // Subtle warm-pink anti-twilight belt near the horizon at dusk.
  float horizonBand = 1.0 - smoothstep(0.0, 0.34, abs(dir.y));
  vec3 sunLight = sunColor * glow * (pow(toward, 1100.0) * 16.0 + pow(toward, 64.0) * 1.05 + pow(toward, 5.0) * 0.38 * (0.35 + horizonBand));
  color += sunLight;
  // Night sky: two layers of twinkling stars, Milky Way dust band, textured moon with soft corona, and shooting stars.
  float high = smoothstep(0.02, 0.16, dir.y);
  vec3 bandN = normalize(vec3(0.42, 0.55, 0.72)), bandU = normalize(cross(bandN, vec3(0.0, 1.0, 0.0))), bandV = cross(bandN, bandU);
  float across = dot(dir, bandN);
  vec2 along = vec2(dot(dir, bandU), dot(dir, bandV));
  float dust = fbm(along * 3.2 + across * 5.0) * fbm(along * 7.0 - across * 3.0 + 4.0);
  float band = exp(-(across * across) / 0.045) * smoothstep(0.14, 0.58, dust * 1.7);
  color += mix(vec3(0.32, 0.34, 0.65), vec3(0.75, 0.78, 0.98), dust) * band * 0.55 * night * high;
  vec3 starLight = stars(dir, 125.0, 0.982) + stars(dir, 260.0, 0.99) * 0.65 + stars(dir, 260.0, 0.968) * band * 0.9;
  color += starLight * night * high;
  float m = dot(dir, moonDir);
  float disc = smoothstep(0.99984, 0.9999, m);
  vec3 moonSide = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)));
  vec2 face = vec2(dot(dir, moonSide), dir.y - moonDir.y) * 1800.0;
  float maria = 0.78 + 0.22 * fbm(face * 0.35 + 3.0);
  vec3 moonLight = vec3(1.0, 0.97, 0.91) * disc * maria * 1.75 + vec3(0.58, 0.72, 1.0) * (pow(max(m, 0.0), 3600.0) * 0.4 + pow(max(m, 0.0), 54.0) * 0.08);
  color += moonLight * moon;
  if (meteorT >= 0.0) {
    vec3 head = normalize(mix(meteorFrom, meteorTo, meteorT)), tail = normalize(mix(meteorFrom, meteorTo, max(meteorT - 0.18, 0.0)));
    vec3 seg = head - tail; float t = clamp(dot(dir - tail, seg) / max(dot(seg, seg), 1e-6), 0.0, 1.0);
    float d = length(dir - (tail + seg * t));
    color += vec3(0.85, 0.9, 1.0) * (smoothstep(0.0035, 0.0, d) * 5.0 + smoothstep(0.012, 0.0, d) * 0.6) * t * t * sin(meteorT * 3.14159) * night;
  }
  // Subtle cyan-gold aurora veil high in the highland/ending night sky, kept gentle under the bloom threshold.
  if (aurora > 0.01) {
    float skyBand = smoothstep(0.12, 0.34, dir.y) * (1.0 - smoothstep(0.54, 0.84, dir.y));
    float waveA = sin(ring.x * 3.8 + ring.y * 2.3 + time * 0.08 + fbm(ring * 2.2 + time * 0.015) * 3.2);
    float waveB = sin(ring.y * 4.5 - ring.x * 2.1 - time * 0.06);
    float ribbon = pow(max(0.5 + 0.5 * waveA, 0.0), 2.6) * (0.55 + 0.45 * waveB);
    vec3 auroraTint = mix(vec3(0.24, 0.78, 0.72), vec3(0.86, 0.74, 0.48), 0.5 + 0.5 * sin(ring.x * 2.0 + time * 0.05));
    color += auroraTint * ribbon * skyBand * aurora * 0.34 * high;
  }
  // Perspective-projected volumetric-lit stylized cumulus deck + high wispy cirrus veil.
  if (dir.y > 0.015) {
    float proj = max(dir.y, 0.0) + 0.16;
    vec2 skyPlane = dir.xz / proj;
    vec2 drift = vec2(time * 0.012, time * 0.005);
    vec2 cp = skyPlane * 0.58 + drift;
    float density = cloudField(cp);
    // Directional light marching (2 steps toward sun/moon) for warm sunlit tops and cool shadowed bellies.
    vec2 lightDir2D = normalize((night > 0.5 ? moonDir.xz : sunDir.xz) + vec2(1e-5));
    float shadowA = cloudField(cp + lightDir2D * 0.14);
    float shadowB = cloudField(cp + lightDir2D * 0.34);
    float lit = exp(-(shadowA * 0.9 + shadowB * 0.8) * 1.45);
    float forward = pow(max(dot(dir, night > 0.5 ? moonDir : sunDir), 0.0), 5.0);
    vec3 cloudDark = mix(mix(top * 0.92, horizCol * 0.82, 0.45), vec3(0.12, 0.16, 0.25), night);
    vec3 cloudBright = mix(mix(vec3(1.04, 1.02, 0.98), sunColor * 1.28 + vec3(0.18), 0.38 + 0.52 * dusk), vec3(0.36, 0.46, 0.62), night);
    vec3 cloudCol = mix(cloudDark, cloudBright, clamp(0.24 + 0.76 * lit + forward * 0.35, 0.0, 1.0));
    cloudCol += (night > 0.5 ? vec3(0.35, 0.48, 0.7) * 0.35 : sunColor * (0.45 + 0.45 * dusk)) * forward * (1.0 - density * 0.55) * (0.45 + 0.55 * lit);
    float cloudMask = density * smoothstep(0.02, 0.14, dir.y) * (1.0 - smoothstep(0.75, 0.98, dir.y));
    // High cirrus wisps above the cumulus deck.
    vec2 cirrusP = skyPlane * 0.34 - drift * 0.55 + vec2(4.2, -2.7);
    float cirrus = smoothstep(0.56, 0.86, fbm(cirrusP * vec2(1.4, 0.65))) * smoothstep(0.06, 0.24, dir.y) * (1.0 - smoothstep(0.68, 0.95, dir.y));
    vec3 cirrusCol = mix(cloudBright * 0.94, horizCol * 1.1, 0.3);
    float nightCloudFade = 1.0 - 0.68 * night;
    color = mix(color, cirrusCol, cirrus * 0.26 * nightCloudFade);
    color = mix(color, cloudCol, cloudMask * 0.86 * nightCloudFade);
  }
  // Distant islands on the sea horizon with anti-aliased silhouettes and atmospheric perspective.
  float aa = max(fwidth(dir.y) * 1.5, 0.0012);
  float farIsle = 0.003 + 0.044 * pow(smoothstep(0.36, 0.82, fbm(ring * 2.2 + 1.7)), 1.55) + 0.005 * noise(ring * 24.0 + 4.0);
  float nearIsle = 0.001 + 0.064 * pow(smoothstep(0.46, 0.86, fbm(ring * 3.1 + 9.0)), 1.35) + 0.006 * noise(ring * 30.0 + 8.0);
  float farMask = smoothstep(farIsle + aa, farIsle - aa, dir.y) * smoothstep(-0.008, 0.004, dir.y);
  float nearMask = smoothstep(nearIsle + aa, nearIsle - aa, dir.y) * smoothstep(-0.008, 0.002, dir.y);
  vec3 farColor = mix(haze, midSky, 0.28) * 0.96 + sunLight * 0.14;
  vec3 nearColor = mix(haze, top, 0.42) * 0.78 + sunLight * 0.08;
  color = mix(color, farColor, farMask * 0.88);
  color = mix(color, nearColor, nearMask * 0.92);
  // Below the horizon only the far sea shows past the sea plane: matches Sea.tsx horizon haze endpoint cleanly.
  color = mix(color, mix(haze, midSky, 0.3), smoothstep(0.002, -0.032, dir.y));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`
// Lightweight sky-plus-ground radiance dome used solely to bake PMREM IBL for PBR materials.
const iblFragment = `uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunPower;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 sky = mix(horizon, top, pow(clamp(d.y, 0.0, 1.0), 0.55));
  vec3 col = d.y >= 0.0 ? sky : mix(horizon * 0.72, ground, pow(clamp(-d.y, 0.0, 1.0), 0.65));
  float s = max(dot(d, sunDir), 0.0);
  col += sunColor * sunPower * (pow(s, 48.0) * 1.4 + pow(s, 6.0) * 0.28);
  gl_FragColor = vec4(col, 1.0);
}`

export function Atmosphere({ player }: { player: Vector3 }) {
  const shadowMapSize = useGameStore(s => qualitySettings[s.quality].shadowMapSize)
  const { gl, scene } = useThree()
  const sun = useRef<DirectionalLight>(null), hemi = useRef<HemisphereLight>(null), dome = useRef<Mesh>(null), fill = useRef<DirectionalLight>(null)
  const sky = useMemo(() => new ShaderMaterial({ uniforms: { top: { value: new Color() }, horizon: { value: new Color() }, sunDir: { value: new V3(0, 1, 0) }, sunColor: { value: new Color() }, glow: { value: 1 }, night: { value: 0 }, dusk: { value: 0 }, haze: { value: new Color() }, moonDir: { value: new V3(0, 1, 0) }, moon: { value: 0 }, aurora: { value: 0 }, time: { value: 0 }, meteorFrom: { value: new V3() }, meteorTo: { value: new V3() }, meteorT: { value: -1 } }, vertexShader: skyVertex, fragmentShader: skyFragment, side: BackSide, depthWrite: false, fog: false }), [])
  const ibl = useMemo(() => {
    const pmrem = new PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const envScene = new Scene()
    const uniforms = { top: { value: new Color() }, horizon: { value: new Color() }, ground: { value: new Color() }, sunDir: { value: new V3(0, 1, 0) }, sunColor: { value: new Color() }, sunPower: { value: 1 } }
    const material = new ShaderMaterial({ uniforms, vertexShader: skyVertex, fragmentShader: iblFragment, side: BackSide, depthWrite: false, fog: false })
    const geometry = new SphereGeometry(10, 24, 12)
    envScene.add(new ThreeMesh(geometry, material))
    return { pmrem, envScene, uniforms, material, geometry, target: null as WebGLRenderTarget | null, lastKey: '' }
  }, [gl])
  useEffect(() => () => {
    sky.dispose()
    scene.environment = null
    ibl.target?.dispose()
    ibl.material.dispose()
    ibl.geometry.dispose()
    ibl.pmrem.dispose()
  }, [sky, ibl, scene])
  const fog = useMemo(() => new Fog(0xffffff, 1, 2), [])
  const meteor = useMemo(() => ({ next: 6, start: -10, look: new V3() }), [])
  const background = useMemo(() => new Color(), [])
  const shadowAxis = useMemo(() => ({ dir: new V3(), right: new V3(), up: new V3(), refUp: new V3(0, 1, 0) }), [])
  useFrame(({ camera, clock }, delta) => {
    // The dome travels with the camera so it never falls outside the far plane as the world grows north.
    dome.current?.position.copy(camera.position)
    const dt = Math.min(delta, 0.1)
    const playing = useGameStore.getState().phase === 'playing'
    const setting = useGameStore.getState().timeOfDay
    let litCount = 0
    for (let i = 0; i < route.litAt.length; i++) if (route.litAt[i] !== null) litCount++
    const highlandTarget = smoothstep(HIGHLAND_FROM, HIGHLAND_FULL, player.z)
    const wetlandTarget = smoothstep(WETLAND_FROM, WETLAND_FULL, player.z) * (1 - highlandTarget)
    if (!atmosphere.snapped) {
      atmosphere.highland = highlandTarget
      atmosphere.wetland = wetlandTarget
    } else if (playing) {
      const zoneK = dampFactor(ZONE_RATE, dt)
      atmosphere.highland += (highlandTarget - atmosphere.highland) * zoneK
      atmosphere.wetland += (wetlandTarget - atmosphere.wetland) * zoneK
    }
    const target = setting === 'journey'
      ? journeyBlend(litCount, atmosphere.wetland, atmosphere.highland, route.litAt.length, route.sunlight.crossed, route.captions.has('highland') ? 2 : route.captions.has('wetland') ? 1 : 0)
      : (TIME_POINT[setting] ?? 0)
    // Snap cleanly on the first frame after mount; allow smooth live time-of-day previews even while paused.
    if (!atmosphere.snapped) {
      atmosphere.time = target
      atmosphere.snapped = true
    } else if (playing || Math.abs(target - atmosphere.time) > 1e-3) {
      const rate = playing ? (setting === 'journey' ? JOURNEY_RATE : TRANSITION_RATE) : 4.8
      atmosphere.time += (target - atmosphere.time) * dampFactor(rate, dt)
      if (Math.abs(target - atmosphere.time) < 1e-3) atmosphere.time = target
    }
    atmosphere.blend = Math.min(1, atmosphere.time); atmosphere.night = Math.max(0, atmosphere.time - 1)
    const p = applyZoneTint(applyZoneTint(blendPresets(atmosphere.time, atmosphere.preset), wetlandTints, atmosphere.wetland, atmosphere.time), highlandTints, atmosphere.highland, atmosphere.time)
    sky.uniforms.top.value.setHex(p.skyTop); sky.uniforms.horizon.value.setHex(p.skyHorizon)
    // Switch directional light cleanly from setting sun to rising moon across dusk→night instead of sweeping empty sky.
    const late = atmosphere.time > 1
    const moonEl = presets.night.sunElevation, moonAz = presets.night.sunAzimuth
    atmosphere.moonDirection.set(Math.sin(moonAz) * Math.cos(moonEl), Math.sin(moonEl), Math.cos(moonAz) * Math.cos(moonEl))
    const sunAz = late ? presets.twilight.sunAzimuth : p.sunAzimuth, sunEl = late ? presets.twilight.sunElevation - 0.25 * atmosphere.night : p.sunElevation
    sky.uniforms.sunDir.value.set(Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), Math.cos(sunAz) * Math.cos(sunEl))
    const moonPhase = smoothstep(1.05, 1.32, atmosphere.time)
    if (moonPhase >= 0.5) atmosphere.sunDirection.copy(atmosphere.moonDirection)
    else {
      const flatSun = Math.cos(Math.max(0.12, p.sunElevation))
      atmosphere.sunDirection.set(Math.sin(sunAz) * flatSun, Math.sin(Math.max(0.12, p.sunElevation)), Math.cos(sunAz) * flatSun)
    }
    const crossFade = 1 - Math.sin(moonPhase * Math.PI) * 0.72
    sky.uniforms.moonDir.value.copy(atmosphere.moonDirection); sky.uniforms.moon.value = smoothstep(0.6, 1.4, atmosphere.time)
    sky.uniforms.sunColor.value.setHex(p.sun); sky.uniforms.glow.value = p.sunGlow
    sky.uniforms.dusk.value = atmosphere.blend * (1 - atmosphere.night)
    sky.uniforms.night.value = smoothstep(0.7, 1.6, atmosphere.time); sky.uniforms.haze.value.setHex(p.fog)
    sky.uniforms.aurora.value = sky.uniforms.night.value * Math.min(1, 0.25 * atmosphere.highland + 0.18 * route.secretsAt.size + (route.completedAt.highland !== null ? 0.55 : 0))
    sky.uniforms.time.value = clock.elapsedTime
    // Re-bake PMREM IBL only when time-of-day or zone tint moves noticeably, giving PBR materials live sky specular/bounce.
    const iblKey = `${Math.round(atmosphere.time * 24)}:${Math.round(atmosphere.wetland * 8)}:${Math.round(atmosphere.highland * 8)}`
    if (iblKey !== ibl.lastKey) {
      ibl.lastKey = iblKey
      ibl.uniforms.top.value.setHex(p.skyTop)
      ibl.uniforms.horizon.value.setHex(p.skyHorizon)
      ibl.uniforms.ground.value.setHex(p.hemiGround)
      ibl.uniforms.sunDir.value.copy(atmosphere.sunDirection)
      ibl.uniforms.sunColor.value.setHex(p.sun)
      ibl.uniforms.sunPower.value = 0.25 + 0.75 * Math.min(1, p.sunIntensity / 3.8)
      const prevTarget = gl.getRenderTarget()
      const next = ibl.pmrem.fromScene(ibl.envScene, 0.04)
      gl.setRenderTarget(prevTarget)
      ibl.target?.dispose()
      ibl.target = next
      scene.environment = next.texture
    }
    scene.environmentIntensity = 0.56 - 0.1 * atmosphere.blend - 0.14 * atmosphere.night
    // Shooting stars: one every 4-10 s at night, crossing about 25 degrees of sky in about a second.
    if (sky.uniforms.night.value > 0.3 && clock.elapsedTime > meteor.next) {
      meteor.next = clock.elapsedTime + 4 + Math.random() * 6; meteor.start = clock.elapsedTime
      // Low in the sky, where the player's view reaches (the camera pitch is limited).
      // Somewhere ahead of the camera (a random azimuth would mostly fall out of view).
      camera.getWorldDirection(meteor.look)
      const az = Math.atan2(meteor.look.x, meteor.look.z) + (Math.random() - 0.5) * 1.1, el = 0.28 + Math.random() * 0.14
      sky.uniforms.meteorFrom.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      sky.uniforms.meteorTo.value.set(Math.sin(az + 0.4) * Math.cos(el - 0.16), Math.sin(el - 0.16), Math.cos(az + 0.4) * Math.cos(el - 0.16))
    }
    const mt = (clock.elapsedTime - meteor.start) / 1.1
    sky.uniforms.meteorT.value = mt >= 0 && mt <= 1 ? mt : -1
    // Shared plant uniforms (worldMaterial.ts) and global wind field.
    updateWind(clock.elapsedTime, atmosphere.highland, atmosphere.wetland)
    worldUniforms.uWindDir.value.set(wind.dirX, wind.dirZ)
    worldUniforms.uWindGust.value = wind.gust
    worldUniforms.uTime.value = clock.elapsedTime
    worldUniforms.uFocusView.value.copy(player); worldUniforms.uFocusView.value.y += 1.25
    worldUniforms.uFocusView.value.applyMatrix4(camera.matrixWorldInverse)
    worldUniforms.uSunView.value.copy(atmosphere.sunDirection).transformDirection(camera.matrixWorldInverse)
    worldUniforms.uSunColor.value.setHex(p.sun); worldUniforms.uRimColor.value.setHex(p.hemiSky)
    worldUniforms.uTranslucency.value = p.sunIntensity * 0.4
    worldUniforms.uDaylight.value = 1 - atmosphere.blend
    fog.color.setHex(p.fog); fog.near = p.fogNear; fog.far = p.fogFar
    scene.fog = fog; scene.background = background.setHex(p.fog)
    gl.toneMappingExposure = p.exposure
    if (hemi.current) { hemi.current.color.setHex(p.hemiSky); hemi.current.groundColor.setHex(p.hemiGround); hemi.current.intensity = p.hemiIntensity }
    // Fill light from behind the camera, slightly above: lifts what faces the viewer, never casts shadows.
    if (fill.current) {
      fill.current.position.copy(camera.position).sub(player).setY(0).normalize().multiplyScalar(10).add(player).setY(player.y + 8)
      fill.current.target.position.copy(player); fill.current.target.updateMatrixWorld()
      fill.current.color.setHex(p.hemiSky); fill.current.intensity = p.fill
    }
    const light = sun.current
    if (light) {
      // Anchor shadow box at player.y (so Highland plateau trees stay inside the frustum) and snap to shadow texels to stop swimming.
      shadowAxis.dir.copy(atmosphere.sunDirection).normalize()
      shadowAxis.right.crossVectors(shadowAxis.refUp, shadowAxis.dir).normalize()
      shadowAxis.up.crossVectors(shadowAxis.dir, shadowAxis.right)
      let sx = player.x, sy = player.y, szPos = player.z
      if (shadowMapSize > 0) {
        const texel = (SHADOW_EXTENT * 2) / shadowMapSize
        const u = Math.round((sx * shadowAxis.right.x + sy * shadowAxis.right.y + szPos * shadowAxis.right.z) / texel) * texel
        const v = Math.round((sx * shadowAxis.up.x + sy * shadowAxis.up.y + szPos * shadowAxis.up.z) / texel) * texel
        const w = sx * shadowAxis.dir.x + sy * shadowAxis.dir.y + szPos * shadowAxis.dir.z
        sx = shadowAxis.right.x * u + shadowAxis.up.x * v + shadowAxis.dir.x * w
        sy = shadowAxis.right.y * u + shadowAxis.up.y * v + shadowAxis.dir.y * w
        szPos = shadowAxis.right.z * u + shadowAxis.up.z * v + shadowAxis.dir.z * w
      }
      light.target.position.set(sx, sy, szPos); light.target.updateMatrixWorld()
      light.position.set(sx + shadowAxis.dir.x * SUN_DISTANCE, sy + shadowAxis.dir.y * SUN_DISTANCE, szPos + shadowAxis.dir.z * SUN_DISTANCE)
      light.color.setHex(p.sun); light.intensity = p.sunIntensity * crossFade; light.shadow.intensity = p.shadowStrength
    }
  })
  return <>
    <mesh ref={dome} material={sky} renderOrder={-1} frustumCulled={false}><sphereGeometry args={[290, 40, 24]}/></mesh>
    <hemisphereLight ref={hemi}/>
    <directionalLight ref={fill}/>
    {/* Keyed on the shadow setting so a quality change rebuilds the shadow map at the new size. */}
    <directionalLight key={shadowMapSize} ref={sun} castShadow={shadowMapSize > 0} shadow-mapSize={[shadowMapSize || 1, shadowMapSize || 1]}
      shadow-camera-left={-SHADOW_EXTENT} shadow-camera-right={SHADOW_EXTENT} shadow-camera-top={SHADOW_EXTENT} shadow-camera-bottom={-SHADOW_EXTENT}
      shadow-camera-near={1} shadow-camera-far={SUN_DISTANCE * 2.2} shadow-bias={-0.00035} shadow-normalBias={0.035}/>
  </>
}
