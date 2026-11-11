import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { groundColor, heightAt } from './terrain'
const SIZE = 130, SEGMENTS = 180
/** Code-generated ground carrier: flat play area, hills beyond the boundary, paths in vertex colour. */
export function Ground() {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS).rotateX(-Math.PI / 2)
    const position = plane.attributes.position, colors = new Float32Array(position.count * 3), color = new Color()
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i)
      position.setY(i, heightAt(x, z))
      color.setRGB(...groundColor(x, z), 'srgb').toArray(colors, i * 3)
    }
    plane.setAttribute('color', new BufferAttribute(colors, 3))
    plane.computeVertexNormals()
    return plane
  }, [])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={1}/></mesh>
}
