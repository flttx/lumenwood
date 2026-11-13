import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three'
import { chunkItems, chunkLod, type ScatterItem } from './scatterChunks'
import { applyFoliage } from './worldMaterial'
// Instanced scatter split into spatial chunks: each chunk is its own InstancedMesh per LOD with a bounding sphere, so
// Three.js frustum-culls whole chunks, and a few times per second each chunk picks its LOD by distance or hides beyond
// `maxDistance`. Used for trees, undergrowth and props, so a much larger world only draws what is near and in view.
const CHECK_INTERVAL = 0.25, up = new Vector3(0, 1, 0)

export interface ScatterProps {
  url: string
  /** Mesh names in the GLB, LOD0 first; an optional second name is the far LOD. */
  lods: string[]
  items: readonly ScatterItem[]
  chunkSize?: number
  lodDistance?: number
  maxDistance: number
  castShadow?: boolean
  receiveShadow?: boolean
  /** Plants: leaf translucency, rim light, foot occlusion and wind sway (worldMaterial.ts); `sway` is the top's sway as a fraction of height. */
  foliage?: { sway: number }
}

export function Scatter({ url, lods, items, chunkSize = 32, lodDistance = 30, maxDistance, castShadow = false, receiveShadow = true, foliage }: ScatterProps) {
  const { scene } = useGLTF(url, false, false)
  const chunks = useMemo(() => {
    const meshes = lods.map(name => {
      const node = scene.getObjectByName(name)
      if (!(node instanceof Mesh)) throw new Error(`${url} has no mesh named ${name}`)
      return node
    })
    if (foliage) {
      const base = meshes[0].geometry
      if (!base.boundingBox) base.computeBoundingBox()
      const height = Math.max(0.1, base.boundingBox!.max.y)
      for (const m of meshes) for (const material of Array.isArray(m.material) ? m.material : [m.material]) applyFoliage(material, { height, sway: foliage.sway })
    }
    const matrix = new Matrix4(), rotation = new Quaternion(), position = new Vector3(), scale = new Vector3()
    return chunkItems(items, chunkSize).map(chunk => ({
      chunk,
      levels: meshes.map(source => {
        const instanced = new InstancedMesh(source.geometry, source.material, chunk.items.length)
        chunk.items.forEach((item, i) => instanced.setMatrixAt(i, matrix.compose(position.set(item.x, item.y, item.z), rotation.setFromAxisAngle(up, item.angle), scale.setScalar(item.scale))))
        instanced.computeBoundingSphere()
        instanced.castShadow = castShadow; instanced.receiveShadow = receiveShadow
        instanced.visible = false
        return instanced
      }),
    }))
  }, [scene, url, lods, items, chunkSize, castShadow, receiveShadow, foliage])
  // Instanced meshes own GPU instance buffers; release them when the layer goes away (geometry/material belong to the GLB).
  useEffect(() => () => chunks.forEach(c => c.levels.forEach(l => l.dispose())), [chunks])
  const timer = useRef(CHECK_INTERVAL)
  useFrame(({ camera }, delta) => {
    if ((timer.current += delta) < CHECK_INTERVAL) return
    timer.current = 0
    for (const { chunk, levels } of chunks) {
      const lod = chunkLod(Math.hypot(chunk.cx - camera.position.x, chunk.cz - camera.position.z), chunk.radius, lodDistance, maxDistance, levels.length > 1)
      levels.forEach((level, i) => { level.visible = i === lod })
    }
  })
  return <>{chunks.flatMap(c => c.levels.map((level, i) => <primitive key={`${c.chunk.key}:${i}`} object={level}/>))}</>
}
