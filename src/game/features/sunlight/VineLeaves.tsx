import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { assetConfig } from '../../assets/config'
import { applyFoliage } from '../../rendering/worldMaterial'
import { SUN_BRIDGE, sunlightDeckHeight } from './layout'

/** Existing VEG-006 foliage dresses the temporary roots. One instanced draw, scaled with the growing bridge parent. */
export function VineLeaves() {
  const { scene } = useGLTF(`${assetConfig.baseUrl}models/vegetation/VEG-006.glb`, false, false)
  const items = useMemo(() => {
    const source = scene.getObjectByName('VEG-006_LOD0')
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error('VEG-006_LOD0 missing for bridge leaves')
    const material = source.material.clone(); material.userData.foliage = false
    applyFoliage(material, { height: 0.9, sway: 0.035 })
    const mesh = new InstancedMesh(source.geometry, material, 14), matrix = new Matrix4(), q = new Quaternion(), pos = new Vector3(), scale = new Vector3(), up = new Vector3(0, 1, 0)
    for (let i = 0; i < 14; i++) {
      const t = 0.12 + Math.floor(i / 2) * 0.125, side = i % 2 ? 1 : -1, z = t * (SUN_BRIDGE.to - SUN_BRIDGE.from)
      const y = sunlightDeckHeight(SUN_BRIDGE.x, SUN_BRIDGE.from + z, true)
      mesh.setMatrixAt(i, matrix.compose(pos.set(side * (SUN_BRIDGE.halfWidth - 0.1), y - 0.08, z), q.setFromAxisAngle(up, side * 1.3 + i * 0.4), scale.setScalar(0.32 + i % 3 * 0.045)))
    }
    mesh.receiveShadow = true
    mesh.computeBoundingSphere()
    return { mesh, material }
  }, [scene])
  useEffect(() => () => { items.mesh.dispose(); items.material.dispose() }, [items])
  return <primitive object={items.mesh}/>
}
