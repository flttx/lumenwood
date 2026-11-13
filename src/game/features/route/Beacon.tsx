import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, CylinderGeometry, ShaderMaterial, type Mesh } from 'three'
import { reflectionSkips } from '../../rendering/planarReflection'
import { ANCIENT_TREE, PLATEAU_HEIGHT, TREE_HEIGHT } from '../../world/zones/highlandLayout'
import { atmosphere } from '../../rendering/timeOfDay'
import { route, routeClock } from './progress'
// The ancient tree as a landmark (third pass, 2026-11-12; A Short Hike's lesson: a goal you can see from the start). A soft
// column of light rises from its crown above the forest canopy, so it shows between the treetops from the camp onward:
// faint in daylight, clearer at dusk, brighter for each lit cradle, fullest after the ending.
const HEIGHT = 70, RADIUS = 5
const vertexShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
const fragmentShader = `uniform vec3 uColor; uniform float uStrength; uniform float uTime; varying vec2 vUv;
void main() {
  float side = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float rise = 0.85 + 0.15 * sin(uTime * 0.7 - vUv.y * 6.0);
  // Bases clamped: pow() of a hair-below-zero edge value is NaN, which bloom smeared into a white-out at night.
  gl_FragColor = vec4(uColor * pow(max(side, 0.0), 2.5) * pow(max(1.0 - vUv.y, 0.0), 2.2) * rise * uStrength, 1.0);
}`

export function Beacon() {
  const { geometry, material } = useMemo(() => ({
    geometry: new CylinderGeometry(RADIUS * 0.6, RADIUS, HEIGHT, 24, 1, true).translate(0, HEIGHT / 2, 0),
    material: new ShaderMaterial({ uniforms: { uColor: { value: new Color(0xffd894) }, uStrength: { value: 0 }, uTime: { value: 0 } }, vertexShader, fragmentShader, blending: AdditiveBlending, transparent: true, depthWrite: false, fog: false }),
  }), [])
  const mesh = useRef<Mesh>(null)
  // Not mirrored in the water (the column would double in every pond).
  useEffect(() => { const m = mesh.current; if (!m) return; reflectionSkips.add(m); return () => { reflectionSkips.delete(m) } }, [])
  useFrame(({ clock }) => {
    const lit = route.litAt.filter(t => t !== null).length, done = route.completedAt.highland
    const ending = done === null ? 0 : Math.min(1, (routeClock.now - done) / 8)
    material.uniforms.uTime.value = clock.elapsedTime
    // Kept under the night bloom threshold (0.55): bloom passes a whole pixel once it crosses the threshold, and a 70 m
    // column over clear night sky bloomed into a white-out across the frame.
    material.uniforms.uStrength.value = (0.1 + 0.1 * atmosphere.blend) * (1 + lit * 0.05) + ending * 0.12
  })
  return <mesh ref={mesh} geometry={geometry} material={material} position={[ANCIENT_TREE[0], PLATEAU_HEIGHT + TREE_HEIGHT * 0.8, ANCIENT_TREE[1]]} renderOrder={4} frustumCulled={false}/>
}
