import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, type Points } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { fireflyHomes, random } from './swarm'
// Procedural twilight fireflies (code particles, not a visible model asset). Drift and blink run in the vertex shader;
// the CPU only updates a few uniforms per frame. Hidden by day.
const vertexShader = `uniform float uTime; uniform float uSize; attribute vec3 aPhase; varying float vBlink;
void main() {
  vec3 p = position + vec3(sin(uTime * 0.37 + aPhase.x * 6.3) * 0.7, sin(uTime * 0.53 + aPhase.y * 6.3) * 0.35, cos(uTime * 0.31 + aPhase.z * 6.3) * 0.7);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vBlink = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.2 + aPhase.y) + aPhase.x * 40.0), 3.0);
  // Capped and faded right at the lens: a firefly drifting past the camera used to bloom into a white-out.
  gl_PointSize = min(uSize / -mv.z, 48.0);
  vBlink *= smoothstep(0.6, 2.2, -mv.z);
  gl_Position = projectionMatrix * mv;
}`
const fragmentShader = `uniform vec3 uColor; uniform float uOpacity; varying float vBlink;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float glow = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * (glow * glow) * vBlink * uOpacity, 1.0);
  #include <colorspace_fragment>
}`

/** One swarm; `homes` is a flat xyz array (defaults to the camp swarm). */
export function Fireflies({ homes = fireflyHomes, seed = 11 }: { homes?: () => Float32Array; seed?: number }) {
  const dpr = useThree(s => s.viewport.dpr)
  const points = useRef<Points>(null)
  const { geometry, material } = useMemo(() => {
    const positions = homes(), geometry = new BufferGeometry(), rand = random(seed), phase = new Float32Array(positions.length)
    for (let i = 0; i < phase.length; i++) phase[i] = rand()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aPhase', new BufferAttribute(phase, 3))
    const material = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSize: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new Color(0xffd98a) } },
      vertexShader, fragmentShader, blending: AdditiveBlending, transparent: true, depthWrite: false,
    })
    return { geometry, material }
  }, [homes, seed])
  useFrame(({ clock }) => {
    const opacity = atmosphere.preset.fireflies
    if (points.current) points.current.visible = opacity > 0.01 // no draw call by day
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uOpacity.value = opacity
    material.uniforms.uSize.value = 44 * dpr
  })
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false}/>
}
