import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CircleGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
import { BRIDGE } from '../../world/regions'
import { radialGlowTexture } from '../flora/glowSprites'
import { smoothstep } from '../../shared/math'
import { GATE_DELAY, route, routeClock } from './progress'
// The light bridge over the wetland channel (a code effect, not a model): two staggered rows of glowing pads that settle
// onto the water one after another as the wetland stream arrives, finished exactly when the bridge gate opens. One draw call.
const PAD_STEP = 0.55, PAD_SIZE = 1.15, PAD_Y = 0.03
const xs = [BRIDGE.minX + 0.75, BRIDGE.maxX - 0.75]
const pads = Array.from({ length: Math.floor((BRIDGE.maxZ - BRIDGE.minZ) / PAD_STEP) }, (_, i) => ({
  x: xs[i % 2] + Math.sin(i * 2.1) * 0.12, z: BRIDGE.minZ + 0.3 + i * PAD_STEP, order: i,
}))

export function LightBridge() {
  const { mesh, material } = useMemo(() => {
    const material = new MeshBasicMaterial({ color: 0xffe6b8, map: radialGlowTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false })
    const mesh = new InstancedMesh(new CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), material, pads.length)
    mesh.frustumCulled = false; mesh.visible = false
    return { mesh, material }
  }, [])
  const scratch = useMemo(() => ({ matrix: new Matrix4(), position: new Vector3(), scale: new Vector3(), identity: new Quaternion() }), [])
  useFrame(() => {
    const done = route.completedAt.wetland, now = routeClock.now
    mesh.visible = done !== null
    if (done === null) return
    // Pads appear south to north during the stream's travel; each one swells in and then breathes gently.
    const elapsed = now - done
    pads.forEach((pad, i) => {
      const appear = smoothstep(0, 0.6, elapsed - (pad.order / pads.length) * GATE_DELAY * 0.9)
      const size = PAD_SIZE * appear * (1 + 0.06 * Math.sin(now * 2 + i))
      mesh.setMatrixAt(i, scratch.matrix.compose(scratch.position.set(pad.x, PAD_Y, pad.z), scratch.identity, scratch.scale.set(size || 1e-4, 1, size || 1e-4)))
    })
    mesh.instanceMatrix.needsUpdate = true
    material.opacity = 1
  })
  return <primitive object={mesh}/>
}
