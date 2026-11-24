import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, Mesh, QuadraticBezierCurve3, ShaderMaterial, TubeGeometry, Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { WETLAND, rectDistance } from '../../world/regions'
import { lanternBrightness } from '../route/Lanterns'
import { route, routeClock } from '../route/progress'
import { lanternPlacements, routeEnds, zoneLanterns } from '../route/routeLayout'
import { saveRequest } from '../route/save'
import { resonance } from './resonance'

const relayVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const relayFragment = `uniform vec3 uColor; uniform float uTime; uniform float uProgress; uniform float uStrength; varying vec2 vUv;
void main() {
  float head = smoothstep(uProgress, max(0.0, uProgress - 0.14), vUv.x);
  float pulse = 0.65 + 0.35 * sin(vUv.x * 18.0 - uTime * 5.2);
  float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
  float a = head * pulse * ends * uStrength;
  gl_FragColor = vec4(uColor * a * 1.5, a);
}`

/**
 * Act 2 (Wetland) visual & mechanical continuation of Act 1's light-guiding theme:
 * each lit wetland lantern casts a shimmering light relay arc across the foggy pools toward
 * the next wetland lantern and finally the Light Bridge, brightening on lantern pulses.
 */
export function WetlandRelay({ player }: { player: Vector3 }) {
  const relays = useMemo(() => {
    const indices = zoneLanterns('wetland')
    const endpoints: [number, number, number][] = [
      ...indices.map(i => lanternPlacements[i].light),
      [routeEnds.wetland[0], 1.2, routeEnds.wetland[1]],
    ]
    return indices.map((lanternIndex, k) => {
      const a = new Vector3(...endpoints[k]), b = new Vector3(...endpoints[k + 1])
      const mid = a.clone().lerp(b, 0.5)
      mid.y = Math.max(a.y, b.y) + 1.35 + k * 0.25
      const curve = new QuadraticBezierCurve3(a, mid, b)
      const geometry = new TubeGeometry(curve, 36, 0.055, 6, false)
      const material = new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(k === indices.length - 1 ? 0xb4f2ff : 0xffe09a) },
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uStrength: { value: 0 },
        },
        vertexShader: relayVertex,
        fragmentShader: relayFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        fog: false,
        toneMapped: false,
      })
      const mesh = new Mesh(geometry, material)
      mesh.visible = false
      return { lanternIndex, nextIndex: indices[k + 1] ?? -1, mesh, geometry, material }
    })
  }, [])

  useEffect(() => () => {
    relays.forEach(r => { r.geometry.dispose(); r.material.dispose() })
  }, [relays])

  useFrame(() => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return
    const now = routeClock.now
    // Introduce wetland water-conducted lantern resonance once the player steps into the wetlands.
    if (rectDistance(player.x, player.z, WETLAND) === 0 && !route.captions.has('wetlandPulse') && route.completedAt.wetland === null) {
      route.captions.add('wetlandPulse')
      saveRequest.dirty = true
      store.showCaption('湿地的水面会把灯笼的光送得更远，按 F 试试看。')
    }
    const pulseBoost = resonance.pulseOnWater ? resonance.lanternFlare * 0.45 : resonance.lanternFlare * 0.2
    for (const r of relays) {
      const lit = lanternBrightness(route.litAt[r.lanternIndex], now)
      r.mesh.visible = lit > 0.02
      if (!r.mesh.visible) continue
      const nextLit = r.nextIndex >= 0 ? lanternBrightness(route.litAt[r.nextIndex], now) : (route.completedAt.wetland !== null ? 1 : 0)
      r.material.uniforms.uTime.value = now
      // Before the next node is lit, the arc reaches out as a guiding shimmer; once linked, it connects fully.
      r.material.uniforms.uProgress.value = lit * (0.68 + 0.32 * nextLit)
      r.material.uniforms.uStrength.value = lit * (0.34 + 0.26 * nextLit + pulseBoost)
    }
  })

  return <>{relays.map(r => <primitive key={r.lanternIndex} object={r.mesh}/>)}</>
}
