import { useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { groundColor, heightAt, HILL_FULL } from './terrain'
import { worldBounds } from '../regions'
// Code-generated ground in two meshes. The near ground covers every region plus its hills with 1 m quads; the island
// ground (third pass, 2026-11-12) continues with 4 m quads out past the beaches to the seabed, so the sea has shores.
// The near mesh's size is a whole number of island quads, so its edges lie on the island grid; island vertices under
// the near mesh are sunk out of sight instead of cut away.
const MARGIN = HILL_FULL + 40, QUAD = 1, ISLAND_QUAD = 4, ISLAND_MARGIN = 192 // a whole number of island quads
const snap = (v: number) => Math.ceil(v / ISLAND_QUAD) * ISLAND_QUAD
const WIDTH = snap(worldBounds.maxX - worldBounds.minX + 2 * MARGIN), DEPTH = snap(worldBounds.maxZ - worldBounds.minZ + 2 * MARGIN)
const CENTER_X = (worldBounds.minX + worldBounds.maxX) / 2, CENTER_Z = (worldBounds.minZ + worldBounds.maxZ) / 2
/** Extent of the island ground (the sea's seabed map covers the same area). */
export const ISLAND_EXTENT = { minX: CENTER_X - WIDTH / 2 - ISLAND_MARGIN, maxX: CENTER_X + WIDTH / 2 + ISLAND_MARGIN, minZ: CENTER_Z - DEPTH / 2 - ISLAND_MARGIN, maxZ: CENTER_Z + DEPTH / 2 + ISLAND_MARGIN }

function terrainPlane(width: number, depth: number, quad: number, hidden?: (x: number, z: number) => boolean) {
  const plane = new PlaneGeometry(width, depth, Math.round(width / quad), Math.round(depth / quad)).rotateX(-Math.PI / 2).translate(CENTER_X, 0, CENTER_Z)
  const position = plane.attributes.position, colors = new Float32Array(position.count * 3), color = new Color()
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), y = heightAt(x, z)
    position.setY(i, hidden?.(x, z) ? y - 6 : y)
    color.setRGB(...groundColor(x, z, y), 'srgb').toArray(colors, i * 3)
  }
  plane.setAttribute('color', new BufferAttribute(colors, 3))
  plane.computeVertexNormals()
  return plane
}

/** Code-generated ground carrier: flat play area, hills beyond the boundary, paths in vertex colour, beaches and seabed. */
export function Ground() {
  const near = useMemo(() => terrainPlane(WIDTH, DEPTH, QUAD), [])
  const island = useMemo(() => {
    const inside = (x: number, z: number) => Math.abs(x - CENTER_X) < WIDTH / 2 - 0.01 && Math.abs(z - CENTER_Z) < DEPTH / 2 - 0.01
    return terrainPlane(WIDTH + 2 * ISLAND_MARGIN, DEPTH + 2 * ISLAND_MARGIN, ISLAND_QUAD, inside)
  }, [])
  return <>
    <mesh geometry={near} receiveShadow><meshStandardMaterial vertexColors roughness={1}/></mesh>
    <mesh geometry={island} receiveShadow><meshStandardMaterial vertexColors roughness={1}/></mesh>
  </>
}
