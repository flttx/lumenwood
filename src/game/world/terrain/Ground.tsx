import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { groundColor, heightAt, HILL_FULL } from './terrain'
import { worldBounds } from '../regions'
// Covers every region plus its hills with roughly 0.7 m quads.
const MARGIN = HILL_FULL + 30, QUAD = 0.7
const WIDTH = worldBounds.maxX - worldBounds.minX + 2 * MARGIN, DEPTH = worldBounds.maxZ - worldBounds.minZ + 2 * MARGIN
const CENTER_X = (worldBounds.minX + worldBounds.maxX) / 2, CENTER_Z = (worldBounds.minZ + worldBounds.maxZ) / 2
/** Code-generated ground carrier: flat play area, hills beyond the boundary, paths in vertex colour. */
export function Ground() {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(WIDTH, DEPTH, Math.ceil(WIDTH / QUAD), Math.ceil(DEPTH / QUAD)).rotateX(-Math.PI / 2).translate(CENTER_X, 0, CENTER_Z)
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
