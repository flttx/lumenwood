import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, Mesh, QuadraticBezierCurve3, ShaderMaterial, TubeGeometry, Vector3 } from 'three'
import { heightAt } from '../../world/terrain/terrain'
import { ANCIENT_TREE, PLATEAU_HEIGHT } from '../../world/zones/highlandLayout'
import { HOLLOW_HEART, REEF_HEART, SHRINE, VALE_HEART, VISTA_POINT } from '../../world/zones/sideLayout'
import { PLUNGE_POOL } from '../../world/zones/wetlandLayout'
import { reflectionSkips } from '../../rendering/planarReflection'
import { atmosphere } from '../../rendering/timeOfDay'
import { smoothstep } from '../../shared/math'
import { route, routeClock, type SecretId } from '../route/progress'

const arcVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const arcFragment = `uniform vec3 uColor; uniform float uTime; uniform float uProgress; uniform float uStrength; varying vec2 vUv;
void main() {
  float head = smoothstep(uProgress, max(0.0, uProgress - 0.16), vUv.x);
  float stream = 0.55 + 0.45 * sin(vUv.x * 26.0 - uTime * 3.2);
  float ends = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
  float a = head * stream * ends * uStrength;
  gl_FragColor = vec4(uColor * a * 1.4, a);
}`

const ARC_SPECS: readonly { id: SecretId; x: number; z: number; arch: number; color: number }[] = [
  { id: 'glen', x: PLUNGE_POOL.x, z: PLUNGE_POOL.z, arch: 64, color: 0x9ceeff },
  { id: 'hollow', x: HOLLOW_HEART[0], z: HOLLOW_HEART[1], arch: 70, color: 0xaef6cc },
  { id: 'lake', x: SHRINE[0], z: SHRINE[1], arch: 60, color: 0xffe4a8 },
  { id: 'overlook', x: VISTA_POINT[0], z: VISTA_POINT[1], arch: 66, color: 0xffc988 },
  { id: 'vale', x: VALE_HEART[0], z: VALE_HEART[1], arch: 68, color: 0xffe89e },
  { id: 'reef', x: REEF_HEART[0], z: REEF_HEART[1], arch: 86, color: 0x8ef2ff },
]

/**
 * Sky-spanning light arcs rising from each solved side-area secret into the Ancient Tree's crown.
 * Makes optional exploration visibly transform the skyline and converge into the ending climax.
 */
export function ResonanceArcs() {
  const arcs = useMemo(() => {
    const crown = new Vector3(ANCIENT_TREE[0], PLATEAU_HEIGHT + 18, ANCIENT_TREE[1])
    return ARC_SPECS.map(spec => {
      const start = new Vector3(spec.x, heightAt(spec.x, spec.z) + 3.5, spec.z)
      const mid = start.clone().lerp(crown, 0.5)
      mid.y = Math.max(start.y, crown.y) + spec.arch
      const geometry = new TubeGeometry(new QuadraticBezierCurve3(start, mid, crown), 48, 0.2, 6, false)
      const material = new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color(spec.color) },
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uStrength: { value: 0 },
        },
        vertexShader: arcVertex,
        fragmentShader: arcFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        fog: false,
        toneMapped: false,
      })
      const mesh = new Mesh(geometry, material)
      mesh.visible = false
      mesh.frustumCulled = false
      return { id: spec.id, mesh, geometry, material }
    })
  }, [])

  useEffect(() => {
    arcs.forEach(a => reflectionSkips.add(a.mesh))
    return () => {
      arcs.forEach(a => { reflectionSkips.delete(a.mesh); a.geometry.dispose(); a.material.dispose() })
    }
  }, [arcs])

  useFrame(() => {
    const now = routeClock.now
    const done = route.completedAt.highland
    const endingSurge = done === null ? 0 : smoothstep(done + 1, done + 8, now)
    const skyVis = 0.24 + 0.36 * atmosphere.blend
    for (const a of arcs) {
      const solvedAt = route.secretsAt.get(a.id)
      a.mesh.visible = solvedAt !== undefined
      if (solvedAt === undefined) continue
      const rise = smoothstep(solvedAt, solvedAt + 4.5, now)
      a.material.uniforms.uTime.value = now
      a.material.uniforms.uProgress.value = rise
      a.material.uniforms.uStrength.value = rise * (skyVis + 0.34 * endingSurge)
    }
  })

  return <>{arcs.map(a => <primitive key={a.id} object={a.mesh}/>)}</>
}
