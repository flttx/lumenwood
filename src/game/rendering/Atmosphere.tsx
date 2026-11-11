import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackSide, Color, Fog, ShaderMaterial, type DirectionalLight, type HemisphereLight, type Mesh, type Vector3 } from 'three'
import { useGameStore } from '../../state/gameStore'
import { qualitySettings } from './config'
import { atmosphere, blendPresets } from './timeOfDay'
import { dampFactor } from '../player/movement'
// Sky, fog and lights for the current time of day. Switching eases over a few seconds; all updates happen in the frame
// loop on Three.js objects, never through React state.
const TRANSITION_RATE = 1.2, SUN_DISTANCE = 40, SHADOW_EXTENT = 20
const skyVertex = 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const skyFragment = `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  gl_FragColor = vec4(mix(horizon, top, pow(h, 0.55)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function Atmosphere({ player }: { player: Vector3 }) {
  const shadowMapSize = useGameStore(s => qualitySettings[s.quality].shadowMapSize)
  const { gl, scene } = useThree()
  const sun = useRef<DirectionalLight>(null), hemi = useRef<HemisphereLight>(null), dome = useRef<Mesh>(null)
  const sky = useMemo(() => new ShaderMaterial({ uniforms: { top: { value: new Color() }, horizon: { value: new Color() } }, vertexShader: skyVertex, fragmentShader: skyFragment, side: BackSide, depthWrite: false, fog: false }), [])
  const fog = useMemo(() => new Fog(0xffffff, 1, 2), [])
  const background = useMemo(() => new Color(), [])
  useFrame(({ camera }, delta) => {
    // The dome travels with the camera so it never falls outside the far plane as the world grows north.
    dome.current?.position.copy(camera.position)
    const target = useGameStore.getState().timeOfDay === 'twilight' ? 1 : 0
    atmosphere.blend += (target - atmosphere.blend) * dampFactor(TRANSITION_RATE, Math.min(delta, 0.1))
    if (Math.abs(target - atmosphere.blend) < 1e-3) atmosphere.blend = target
    const p = blendPresets(atmosphere.blend, atmosphere.preset)
    sky.uniforms.top.value.setHex(p.skyTop); sky.uniforms.horizon.value.setHex(p.skyHorizon)
    fog.color.setHex(p.fog); fog.near = p.fogNear; fog.far = p.fogFar
    scene.fog = fog; scene.background = background.setHex(p.fog)
    gl.toneMappingExposure = p.exposure
    if (hemi.current) { hemi.current.color.setHex(p.hemiSky); hemi.current.groundColor.setHex(p.hemiGround); hemi.current.intensity = p.hemiIntensity }
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
    <mesh ref={dome} material={sky} renderOrder={-1} frustumCulled={false}><sphereGeometry args={[100, 32, 16]}/></mesh>
    <hemisphereLight ref={hemi}/>
    {/* Keyed on the shadow setting so a quality change rebuilds the shadow map at the new size. */}
    <directionalLight key={shadowMapSize} ref={sun} castShadow={shadowMapSize > 0} shadow-mapSize={[shadowMapSize || 1, shadowMapSize || 1]}
      shadow-camera-left={-SHADOW_EXTENT} shadow-camera-right={SHADOW_EXTENT} shadow-camera-top={SHADOW_EXTENT} shadow-camera-bottom={-SHADOW_EXTENT}
      shadow-camera-near={1} shadow-camera-far={SUN_DISTANCE * 2} shadow-bias={-0.0004} shadow-normalBias={0.04}/>
  </>
}
