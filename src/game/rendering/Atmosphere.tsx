import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackSide, Color, Fog, ShaderMaterial, Vector3 as V3, type DirectionalLight, type HemisphereLight, type Mesh, type Vector3 } from 'three'
import { useGameStore } from '../../state/gameStore'
import { qualitySettings } from './config'
import { applyZoneTint, atmosphere, blendPresets, highlandTints, wetlandTints } from './timeOfDay'
import { smoothstep } from '../shared/math'
import { sz } from '../world/scale'
import { dampFactor } from '../player/movement'
// Sky, fog and lights for the current time of day. Switching eases over a few seconds; all updates happen in the frame
// loop on Three.js objects, never through React state.
// The low afternoon sun throws long shadows from 18–30 m trees, so the shadow frustum covers ±40 m around the player.
const TRANSITION_RATE = 1.2, SUN_DISTANCE = 90, SHADOW_EXTENT = 40
// The wetland look fades in along the corridor (z 30 → 40) and eases, so teleports and the gate do not pop.
const WETLAND_FROM = sz(30), WETLAND_FULL = sz(40), ZONE_RATE = 1.5
// The highland look takes over up the ramp (z 84 → 100); the wetland look fades out first so they never stack.
const HIGHLAND_FROM = sz(84), HIGHLAND_FULL = sz(100)
const skyVertex = 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const skyFragment = `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float glow; varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);
  vec3 color = mix(horizon, top, pow(h, 0.5));
  // Sun: a hot disc, a tight halo and a wide warm glow that also warms the horizon haze on the sun's side.
  float toward = max(dot(dir, sunDir), 0.0);
  float horizonBand = 1.0 - smoothstep(0.0, 0.35, abs(dir.y));
  color += sunColor * glow * (pow(toward, 900.0) * 14.0 + pow(toward, 40.0) * 0.9 + pow(toward, 5.0) * 0.35 * (0.4 + horizonBand));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function Atmosphere({ player }: { player: Vector3 }) {
  const shadowMapSize = useGameStore(s => qualitySettings[s.quality].shadowMapSize)
  const { gl, scene } = useThree()
  const sun = useRef<DirectionalLight>(null), hemi = useRef<HemisphereLight>(null), dome = useRef<Mesh>(null), fill = useRef<DirectionalLight>(null)
  const sky = useMemo(() => new ShaderMaterial({ uniforms: { top: { value: new Color() }, horizon: { value: new Color() }, sunDir: { value: new V3(0, 1, 0) }, sunColor: { value: new Color() }, glow: { value: 1 } }, vertexShader: skyVertex, fragmentShader: skyFragment, side: BackSide, depthWrite: false, fog: false }), [])
  const fog = useMemo(() => new Fog(0xffffff, 1, 2), [])
  const background = useMemo(() => new Color(), [])
  useFrame(({ camera }, delta) => {
    // The dome travels with the camera so it never falls outside the far plane as the world grows north.
    dome.current?.position.copy(camera.position)
    const target = useGameStore.getState().timeOfDay === 'twilight' ? 1 : 0
    atmosphere.blend += (target - atmosphere.blend) * dampFactor(TRANSITION_RATE, Math.min(delta, 0.1))
    if (Math.abs(target - atmosphere.blend) < 1e-3) atmosphere.blend = target
    const zoneK = dampFactor(ZONE_RATE, Math.min(delta, 0.1)), highland = smoothstep(HIGHLAND_FROM, HIGHLAND_FULL, player.z)
    atmosphere.highland += (highland - atmosphere.highland) * zoneK
    atmosphere.wetland += (smoothstep(WETLAND_FROM, WETLAND_FULL, player.z) * (1 - highland) - atmosphere.wetland) * zoneK
    const p = applyZoneTint(applyZoneTint(blendPresets(atmosphere.blend, atmosphere.preset), wetlandTints, atmosphere.wetland, atmosphere.blend), highlandTints, atmosphere.highland, atmosphere.blend)
    sky.uniforms.top.value.setHex(p.skyTop); sky.uniforms.horizon.value.setHex(p.skyHorizon)
    const flatSun = Math.cos(p.sunElevation)
    sky.uniforms.sunDir.value.set(Math.sin(p.sunAzimuth) * flatSun, Math.sin(p.sunElevation), Math.cos(p.sunAzimuth) * flatSun)
    sky.uniforms.sunColor.value.setHex(p.sun); sky.uniforms.glow.value = p.sunGlow
    atmosphere.sunDirection.copy(sky.uniforms.sunDir.value)
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
