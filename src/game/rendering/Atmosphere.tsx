import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackSide, Color, Fog, ShaderMaterial, Vector3 as V3, type DirectionalLight, type HemisphereLight, type Mesh, type Vector3 } from 'three'
import { useGameStore } from '../../state/gameStore'
import { qualitySettings } from './config'
import { TIME_POINT, applyZoneTint, atmosphere, blendPresets, highlandTints, journeyBlend, presets, wetlandTints } from './timeOfDay'
import { route } from '../features/route/progress'
import { smoothstep } from '../shared/math'
import { sz } from '../world/scale'
import { dampFactor } from '../player/movement'
import { worldUniforms } from './worldMaterial'
// Sky, fog and lights for the current time of day. Switching eases over a few seconds; all updates happen in the frame
// loop on Three.js objects, never through React state.
// The low afternoon sun throws long shadows from 18–30 m trees, so the shadow frustum covers ±40 m around the player.
const TRANSITION_RATE = 1.2, JOURNEY_RATE = 0.35, SUN_DISTANCE = 90, SHADOW_EXTENT = 40
// The wetland look fades in along the corridor (z 30 → 40) and eases, so teleports and the gate do not pop.
const WETLAND_FROM = sz(30), WETLAND_FULL = sz(40), ZONE_RATE = 1.5
// The highland look takes over up the ramp (z 84 → 100); the wetland look fades out first so they never stack.
const HIGHLAND_FROM = sz(84), HIGHLAND_FULL = sz(100)
const skyVertex = 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const skyFragment = `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float glow; uniform float night;
uniform vec3 haze; uniform vec3 moonDir; uniform float moon; uniform float time;
uniform vec3 meteorFrom; uniform vec3 meteorTo; uniform float meteorT;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
// One layer of stars: cells on the direction cube; a few cells hold a star of random brightness, colour and twinkle.
vec3 stars(vec3 dir, float density, float threshold) {
  vec3 cell = floor(dir * density), f = fract(dir * density) - 0.5;
  float h = hash3(cell);
  if (h < threshold) return vec3(0.0);
  vec3 offset = vec3(hash3(cell + 1.3), hash3(cell + 2.7), hash3(cell + 4.1)) - 0.5;
  float d = length(f - offset * 0.7);
  float bright = pow((h - threshold) / (1.0 - threshold), 1.5) * (0.65 + 0.35 * sin(time * (1.5 + h * 4.0) + h * 60.0));
  vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.7), hash3(cell + 9.1));
  return tint * bright * smoothstep(0.12, 0.0, d) * 3.0;
}
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);
  // Noise is sampled on the horizon circle (not by angle), so there is no seam behind the camera.
  vec2 ring = normalize(dir.xz + vec2(1e-5));
  vec3 color = mix(horizon, top, pow(h, 0.5));
  // Sun: a hot disc, a tight halo and a wide warm glow that also warms the horizon haze on the sun's side.
  float toward = max(dot(dir, sunDir), 0.0);
  float horizonBand = 1.0 - smoothstep(0.0, 0.35, abs(dir.y));
  vec3 sunLight = sunColor * glow * (pow(toward, 900.0) * 14.0 + pow(toward, 40.0) * 0.9 + pow(toward, 5.0) * 0.35 * (0.4 + horizonBand));
  color += sunLight;
  // Night sky (third pass): two layers of twinkling stars, the Milky Way as a dusty band across the sky, a full moon with
  // a soft halo, and now and then a shooting star. All fade in after dusk and out toward the horizon haze.
  float high = smoothstep(0.02, 0.16, dir.y);
  vec3 bandN = normalize(vec3(0.42, 0.55, 0.72)), bandU = normalize(cross(bandN, vec3(0.0, 1.0, 0.0))), bandV = cross(bandN, bandU);
  float across = dot(dir, bandN);
  vec2 along = vec2(dot(dir, bandU), dot(dir, bandV));
  float dust = fbm(along * 3.2 + across * 5.0) * fbm(along * 7.0 - across * 3.0 + 4.0);
  float band = exp(-(across * across) / 0.04) * smoothstep(0.15, 0.6, dust * 1.6);
  color += mix(vec3(0.35, 0.3, 0.6), vec3(0.75, 0.7, 0.95), dust) * band * 0.45 * night * high;
  vec3 starLight = stars(dir, 140.0, 0.985) + stars(dir, 320.0, 0.992) * 0.6 + stars(dir, 320.0, 0.97) * band * 0.8;
  color += starLight * night * high;
  float m = dot(dir, moonDir);
  float disc = smoothstep(0.99984, 0.9999, m); // about 0.9 degrees: a stylised moon a little larger than life
  vec3 moonSide = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)));
  vec2 face = vec2(dot(dir, moonSide), dir.y - moonDir.y) * 1800.0;
  float maria = 0.78 + 0.22 * fbm(face * 0.35 + 3.0);
  vec3 moonLight = vec3(1.0, 0.97, 0.9) * disc * maria * 1.6 + vec3(0.6, 0.7, 1.0) * (pow(max(m, 0.0), 4000.0) * 0.35 + pow(max(m, 0.0), 60.0) * 0.05);
  color += moonLight * moon;
  if (meteorT >= 0.0) {
    vec3 head = normalize(mix(meteorFrom, meteorTo, meteorT)), tail = normalize(mix(meteorFrom, meteorTo, max(meteorT - 0.18, 0.0)));
    vec3 seg = head - tail; float t = clamp(dot(dir - tail, seg) / max(dot(seg, seg), 1e-6), 0.0, 1.0);
    float d = length(dir - (tail + seg * t));
    color += vec3(0.85, 0.9, 1.0) * (smoothstep(0.0035, 0.0, d) * 5.0 + smoothstep(0.012, 0.0, d) * 0.6) * t * t * sin(meteorT * 3.14159) * night;
  }
  // Cloud band: soft streaks over the horizon, rim-lit on the sun's side (concept boards: warm sunset clouds); darker and
  // moonlit after dusk; drifting slowly.
  vec2 cp = ring * 2.4 + vec2(dir.y * 9.0, -dir.y * 5.0) + vec2(time * 0.004, 0.0);
  float cloud = smoothstep(0.52, 0.85, fbm(cp + vec2(0.0, fbm(cp * 0.7) * 0.6))) * smoothstep(0.03, 0.12, dir.y) * (1.0 - smoothstep(0.22, 0.42, dir.y));
  vec3 cloudColor = mix(mix(horizon, top, 0.35) * 0.9, sunColor * 1.25 + horizon * 0.3, pow(toward, 3.0) * 0.85 + 0.15) * (1.0 - 0.45 * night);
  color = mix(color, cloudColor, cloud * 0.7);
  // The forest is an island (third pass): low islands on the sea horizon instead of mountain ranges, the far ones fading
  // into the haze.
  float farIsle = 0.004 + 0.05 * pow(smoothstep(0.35, 0.8, fbm(ring * 2.2 + 1.7)), 1.5) + 0.006 * noise(ring * 24.0 + 4.0);
  float nearIsle = 0.002 + 0.075 * pow(smoothstep(0.45, 0.85, fbm(ring * 3.1 + 9.0)), 1.3) + 0.008 * noise(ring * 30.0 + 8.0);
  vec3 farColor = mix(haze, top, 0.2) * 0.95, nearColor = mix(haze, top, 0.45) * 0.72;
  color = mix(color, farColor + sunLight * 0.2, step(dir.y, farIsle) * smoothstep(-0.01, 0.004, dir.y));
  color = mix(color, nearColor, step(dir.y, nearIsle) * smoothstep(-0.01, 0.002, dir.y));
  // Below the horizon only the far sea shows past the sea plane: the haze it fades into.
  color = mix(color, mix(haze, top, 0.35), smoothstep(0.0, -0.03, dir.y));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function Atmosphere({ player }: { player: Vector3 }) {
  const shadowMapSize = useGameStore(s => qualitySettings[s.quality].shadowMapSize)
  const { gl, scene } = useThree()
  const sun = useRef<DirectionalLight>(null), hemi = useRef<HemisphereLight>(null), dome = useRef<Mesh>(null), fill = useRef<DirectionalLight>(null)
  const sky = useMemo(() => new ShaderMaterial({ uniforms: { top: { value: new Color() }, horizon: { value: new Color() }, sunDir: { value: new V3(0, 1, 0) }, sunColor: { value: new Color() }, glow: { value: 1 }, night: { value: 0 }, haze: { value: new Color() }, moonDir: { value: new V3(0, 1, 0) }, moon: { value: 0 }, time: { value: 0 }, meteorFrom: { value: new V3() }, meteorTo: { value: new V3() }, meteorT: { value: -1 } }, vertexShader: skyVertex, fragmentShader: skyFragment, side: BackSide, depthWrite: false, fog: false }), [])
  const fog = useMemo(() => new Fog(0xffffff, 1, 2), [])
  const meteor = useMemo(() => ({ next: 6, start: -10, look: new V3() }), [])
  const background = useMemo(() => new Color(), [])
  useFrame(({ camera, clock }, delta) => {
    // The dome travels with the camera so it never falls outside the far plane as the world grows north.
    dome.current?.position.copy(camera.position)
    const setting = useGameStore.getState().timeOfDay
    const target = setting === 'journey' ? journeyBlend(route.litAt.filter(t => t !== null).length, atmosphere.wetland, atmosphere.highland, route.litAt.length)
      : TIME_POINT[setting]
    // The journey's sunset eases slowly, so lighting a lantern dims the sky over several seconds.
    atmosphere.time += (target - atmosphere.time) * dampFactor(setting === 'journey' ? JOURNEY_RATE : TRANSITION_RATE, Math.min(delta, 0.1))
    if (Math.abs(target - atmosphere.time) < 1e-3) atmosphere.time = target
    atmosphere.blend = Math.min(1, atmosphere.time); atmosphere.night = Math.max(0, atmosphere.time - 1)
    const zoneK = dampFactor(ZONE_RATE, Math.min(delta, 0.1)), highland = smoothstep(HIGHLAND_FROM, HIGHLAND_FULL, player.z)
    atmosphere.highland += (highland - atmosphere.highland) * zoneK
    atmosphere.wetland += (smoothstep(WETLAND_FROM, WETLAND_FULL, player.z) * (1 - highland) - atmosphere.wetland) * zoneK
    const p = applyZoneTint(applyZoneTint(blendPresets(atmosphere.time, atmosphere.preset), wetlandTints, atmosphere.wetland, atmosphere.time), highlandTints, atmosphere.highland, atmosphere.time)
    sky.uniforms.top.value.setHex(p.skyTop); sky.uniforms.horizon.value.setHex(p.skyHorizon)
    const flatSun = Math.cos(p.sunElevation)
    // The light comes from the sun by day and the moon by night (the preset's direction blends between them); the sky
    // draws each body where it is: the sun keeps its twilight position and sinks below the horizon as night falls.
    atmosphere.sunDirection.set(Math.sin(p.sunAzimuth) * flatSun, Math.sin(p.sunElevation), Math.cos(p.sunAzimuth) * flatSun)
    const late = atmosphere.time > 1, sunAz = late ? presets.twilight.sunAzimuth : p.sunAzimuth, sunEl = late ? presets.twilight.sunElevation - 0.25 * atmosphere.night : p.sunElevation
    sky.uniforms.sunDir.value.set(Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), Math.cos(sunAz) * Math.cos(sunEl))
    const moonEl = presets.night.sunElevation, moonAz = presets.night.sunAzimuth
    atmosphere.moonDirection.set(Math.sin(moonAz) * Math.cos(moonEl), Math.sin(moonEl), Math.cos(moonAz) * Math.cos(moonEl))
    sky.uniforms.moonDir.value.copy(atmosphere.moonDirection); sky.uniforms.moon.value = smoothstep(0.6, 1.4, atmosphere.time)
    sky.uniforms.sunColor.value.setHex(p.sun); sky.uniforms.glow.value = p.sunGlow
    sky.uniforms.night.value = smoothstep(0.7, 1.6, atmosphere.time); sky.uniforms.haze.value.setHex(p.fog)
    sky.uniforms.time.value = clock.elapsedTime
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
    // Shared plant uniforms (worldMaterial.ts): leaves glow through when backlit by the low sun, rims take the sky colour.
    worldUniforms.uTime.value = clock.elapsedTime
    worldUniforms.uSunView.value.copy(atmosphere.sunDirection).transformDirection(camera.matrixWorldInverse)
    worldUniforms.uSunColor.value.setHex(p.sun); worldUniforms.uRimColor.value.setHex(p.hemiSky)
    worldUniforms.uTranslucency.value = p.sunIntensity * 0.4
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
      // The sun follows the player so a small shadow frustum always covers the visible camp.
      const flat = Math.cos(p.sunElevation)
      light.position.set(player.x + Math.sin(p.sunAzimuth) * flat * SUN_DISTANCE, Math.sin(p.sunElevation) * SUN_DISTANCE, player.z + Math.cos(p.sunAzimuth) * flat * SUN_DISTANCE)
      light.target.position.set(player.x, 0, player.z); light.target.updateMatrixWorld()
      light.color.setHex(p.sun); light.intensity = p.sunIntensity; light.shadow.intensity = p.shadowStrength
    }
  })
  return <>
    <mesh ref={dome} material={sky} renderOrder={-1} frustumCulled={false}><sphereGeometry args={[290, 32, 16]}/></mesh>
    <hemisphereLight ref={hemi}/>
    <directionalLight ref={fill}/>
    {/* Keyed on the shadow setting so a quality change rebuilds the shadow map at the new size. */}
    <directionalLight key={shadowMapSize} ref={sun} castShadow={shadowMapSize > 0} shadow-mapSize={[shadowMapSize || 1, shadowMapSize || 1]}
      shadow-camera-left={-SHADOW_EXTENT} shadow-camera-right={SHADOW_EXTENT} shadow-camera-top={SHADOW_EXTENT} shadow-camera-bottom={-SHADOW_EXTENT}
      shadow-camera-near={1} shadow-camera-far={SUN_DISTANCE * 2} shadow-bias={-0.0004} shadow-normalBias={0.04}/>
  </>
}
