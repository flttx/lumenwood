import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { assetConfig } from '../../assets/config'
import { applyFoliage } from '../../rendering/worldMaterial'
import { route } from '../route/progress'
import { SUN_BRIDGE, sunlightDeckHeight } from './layout'

/** Mild elastic overshoot so fern tufts sprout crisply as the bridge's growth frontier passes. */
const backOut = (u: number) => {
  if (u <= 0) return 0
  if (u >= 1) return 1
  const t = u - 1
  return 1 + 1.4 * t * t * t + 0.65 * t * t
}

/** Existing VEG-006 foliage dresses the temporary roots; each leaf pops open staggered along the bridge's growth. */
export function VineLeaves() {
  const { scene } = useGLTF(`${assetConfig.baseUrl}models/vegetation/VEG-006.glb`, false, false)
  const items = useMemo(() => {
    const source = scene.getObjectByName('VEG-006_LOD0')
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error('VEG-006_LOD0 missing for bridge leaves')
    const material = source.material.clone(); material.userData.foliage = false
    applyFoliage(material, { height: 0.9, sway: 0.035 })
    const mesh = new InstancedMesh(source.geometry, material, 14), matrix = new Matrix4(), scaleVec = new Vector3(), up = new Vector3(0, 1, 0)
    const leaves = Array.from({ length: 14 }, (_, i) => {
      const tAlong = 0.12 + Math.floor(i / 2) * 0.125, side = i % 2 ? 1 : -1, z = tAlong * (SUN_BRIDGE.to - SUN_BRIDGE.from)
      const y = sunlightDeckHeight(SUN_BRIDGE.x, SUN_BRIDGE.from + z, true)
      const pos = new Vector3(side * (SUN_BRIDGE.halfWidth - 0.1), y - 0.08, z)
      const q = new Quaternion().setFromAxisAngle(up, side * 1.3 + i * 0.4)
      const baseScale = 0.32 + (i % 3) * 0.045
      mesh.setMatrixAt(i, matrix.compose(pos, q, scaleVec.setScalar(0)))
      return { tAlong, pos, q, baseScale }
    })
    mesh.receiveShadow = true
    mesh.computeBoundingSphere()
    return { mesh, material, leaves, matrix, scaleVec, lastGrow: -1 }
  }, [scene])
  useEffect(() => () => { items.mesh.dispose(); items.material.dispose() }, [items])
  useFrame(() => {
    const g = route.sunlight.growth
    if (Math.abs(g - items.lastGrow) < 0.0005) return
    items.lastGrow = g
    items.leaves.forEach((leaf, i) => {
      const reveal = Math.max(0, Math.min(1, (g - leaf.tAlong * 0.85) / 0.18))
      const s = leaf.baseScale * backOut(reveal)
      items.mesh.setMatrixAt(i, items.matrix.compose(leaf.pos, leaf.q, items.scaleVec.setScalar(s)))
    })
    items.mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={items.mesh}/>
}
