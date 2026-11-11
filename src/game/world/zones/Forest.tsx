import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Matrix4, Mesh, Quaternion, Vector3, type InstancedMesh } from 'three'
import { assetConfig } from '../../assets/config'
import { forestTrees, outerTrees } from './forestLayout'
import { Ground } from '../terrain/Ground'
import { selectLod } from './treeLod'
import { Cabin } from './Cabin'
// VEG-001 (docs/ASSET_MANIFEST.md): one GLB holding two meshes that share a material.
const TREE_URL = `${assetConfig.baseUrl}models/vegetation/VEG-001.glb`
const LOD_NAMES = ['VEG-001_LOD0', 'VEG-001_LOD1']
const LOD_INTERVAL = 0.2
const up = new Vector3(0, 1, 0)
const treeMatrix = (x: number, y: number, z: number, angle: number, scale: number) =>
  new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(up, angle), new Vector3(scale, scale, scale))
const treeMatrices = forestTrees.map((tree, i) => treeMatrix(tree.x, 0, tree.z, i * 2.39996, tree.scale))
const outerMatrices = outerTrees.map((tree, i) => treeMatrix(tree.x, tree.y, tree.z, i * 1.7, tree.scale))
// The file uses neither Draco nor meshopt; skipping both keeps the build free of CDN decoder requests.
useGLTF.preload(TREE_URL, false, false)

function Trees() {
  const { scene } = useGLTF(TREE_URL, false, false)
  const lodMeshes = useMemo(() => LOD_NAMES.map(name => {
    const node = scene.getObjectByName(name)
    if (!(node instanceof Mesh)) throw new Error(`${TREE_URL} has no mesh named ${name}`)
    return node
  }), [scene])
  const instances = useRef<(InstancedMesh | null)[]>([])
  const setOuter = (node: InstancedMesh | null) => {
    if (!node) return
    outerMatrices.forEach((matrix, i) => node.setMatrixAt(i, matrix))
    node.instanceMatrix.needsUpdate = true
    node.computeBoundingSphere()
  }
  const state = useRef({ lods: new Uint8Array(forestTrees.length), elapsed: LOD_INTERVAL, dirty: true })
  // Re-sort trees into the near/far instanced meshes a few times per second; collision and occlusion stay on code proxies.
  useFrame(({ camera }, delta) => {
    const s = state.current, [near, far] = instances.current
    if (!near || !far || (s.elapsed += delta) < LOD_INTERVAL) return
    s.elapsed = 0
    forestTrees.forEach((tree, i) => {
      const lod = selectLod(Math.hypot(tree.x - camera.position.x, tree.z - camera.position.z), s.lods[i])
      if (lod !== s.lods[i]) { s.lods[i] = lod; s.dirty = true }
    })
    if (!s.dirty) return
    s.dirty = false
    near.count = far.count = 0
    treeMatrices.forEach((matrix, i) => { const mesh = s.lods[i] ? far : near; mesh.setMatrixAt(mesh.count++, matrix) })
    near.instanceMatrix.needsUpdate = far.instanceMatrix.needsUpdate = true
  })
  // Instances surround the player, so per-mesh frustum culling would need bounds recomputed on every re-sort.
  return <>{lodMeshes.map((mesh, i) => <instancedMesh key={mesh.name} ref={node => { instances.current[i] = node }} args={[mesh.geometry, mesh.material, forestTrees.length]} frustumCulled={false} castShadow receiveShadow/>)}
    {/* Backdrop trees are always far from the camera, so they use LOD1 only. */}
    <instancedMesh ref={setOuter} args={[lodMeshes[1].geometry, lodMeshes[1].material, outerTrees.length]} frustumCulled={false}/>
  </>
}

export function Forest() {
  // Trees and the cabin appear once their models have loaded.
  return <><Ground/>
    <Suspense fallback={null}><Trees/><Cabin/></Suspense>
  </>
}
