import { useEffect, useMemo } from 'react'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { CLIFF_FOOT, CLIFF_TOP, groundColor, heightAt, HILL_FULL } from './terrain'
import { GLEN, worldBounds } from '../regions'
import { createGroundMaterial } from './groundMaterial'
import { SUN_CLEARING } from '../../features/sunlight/layout'
// Code-generated ground with local replacement patches. The near ground covers every region and its hills with 1 m quads; the island
// ground (third pass, 2026-11-12) continues with 4 m quads out past the beaches to the seabed, so the sea has shores.
// The near mesh's size is a whole number of island quads, so its edges lie on the island grid; island vertices under
// the near mesh are sunk out of sight instead of cut away.
const MARGIN = HILL_FULL + 40, QUAD = 1, ISLAND_QUAD = 4, ISLAND_MARGIN = 192 // a whole number of island quads
const snap = (v: number) => Math.ceil(v / ISLAND_QUAD) * ISLAND_QUAD
const WIDTH = snap(worldBounds.maxX - worldBounds.minX + 2 * MARGIN), DEPTH = snap(worldBounds.maxZ - worldBounds.minZ + 2 * MARGIN)
const CENTER_X = (worldBounds.minX + worldBounds.maxX) / 2, CENTER_Z = (worldBounds.minZ + worldBounds.maxZ) / 2
const grid = (v: number, origin: number, up: boolean) => origin + (up ? Math.ceil(v - origin) : Math.floor(v - origin))
// Align local high-resolution patches to the main 1 m grid, replacing triangles instead of stacking surfaces.
const DAY_PATCH = {
  minX: grid(SUN_CLEARING.minX - 4, CENTER_X - WIDTH / 2, false), maxX: grid(SUN_CLEARING.maxX + 4, CENTER_X - WIDTH / 2, true),
  minZ: grid(SUN_CLEARING.minZ - 4, CENTER_Z - DEPTH / 2, false), maxZ: grid(SUN_CLEARING.maxZ + 4, CENTER_Z - DEPTH / 2, true),
}
const CLIFF_PATCH = {
  minX: grid(CLIFF_TOP - 8, CENTER_X - WIDTH / 2, false), maxX: grid(CLIFF_FOOT + 2, CENTER_X - WIDTH / 2, true),
  minZ: grid(GLEN.minZ - 3, CENTER_Z - DEPTH / 2, false), maxZ: grid(GLEN.maxZ + 3, CENTER_Z - DEPTH / 2, true),
}
const PATCHES = [{ ...DAY_PATCH, quad: 0.25 }, { ...CLIFF_PATCH, quad: 0.5 }]
/** Extent of the island ground (the sea's seabed map covers the same area). */
export const ISLAND_EXTENT = { minX: CENTER_X - WIDTH / 2 - ISLAND_MARGIN, maxX: CENTER_X + WIDTH / 2 + ISLAND_MARGIN, minZ: CENTER_Z - DEPTH / 2 - ISLAND_MARGIN, maxZ: CENTER_Z + DEPTH / 2 + ISLAND_MARGIN }

function terrainPlane(width: number, depth: number, quad: number, hidden?: (x: number, z: number) => boolean, centerX = CENTER_X, centerZ = CENTER_Z, cutPatch = false, stitchEdge = false) {
  const plane = new PlaneGeometry(width, depth, Math.round(width / quad), Math.round(depth / quad)).rotateX(-Math.PI / 2).translate(centerX, 0, centerZ)
  const position = plane.attributes.position, colors = new Float32Array(position.count * 3), color = new Color()
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i)
    let y = heightAt(x, z)
    if (stitchEdge && (Math.abs(Math.abs(x - centerX) - width / 2) < 0.001 || Math.abs(Math.abs(z - centerZ) - depth / 2) < 0.001)) {
      // Fine boundary vertices lie on the coarse edge's straight segment, avoiding T-junction slivers in the hillside.
      const x0 = grid(x, CENTER_X - WIDTH / 2, false), z0 = grid(z, CENTER_Z - DEPTH / 2, false)
      const a = heightAt(x0, z0) * (1 - (x - x0)) + heightAt(x0 + 1, z0) * (x - x0)
      const b = heightAt(x0, z0 + 1) * (1 - (x - x0)) + heightAt(x0 + 1, z0 + 1) * (x - x0)
      y = a * (1 - (z - z0)) + b * (z - z0)
    }
    position.setY(i, hidden?.(x, z) ? y - 6 : y)
    color.setRGB(...groundColor(x, z, y), 'srgb').toArray(colors, i * 3)
  }
  plane.setAttribute('color', new BufferAttribute(colors, 3))
  if (cutPatch) {
    const source = plane.index!, kept: number[] = []
    for (let i = 0; i < source.count; i += 3) {
      const a = source.getX(i), b = source.getX(i + 1), c = source.getX(i + 2)
      const x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3, z = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3
      if (!PATCHES.some(p => x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ)) kept.push(a, b, c)
    }
    plane.setIndex(kept)
  }
  plane.computeVertexNormals()
  return plane
}

/** Code-generated ground carrier: flat play area, hills beyond the boundary, paths in vertex colour, beaches and seabed. */
export function Ground() {
  const material = useMemo(createGroundMaterial, [])
  const near = useMemo(() => terrainPlane(WIDTH, DEPTH, QUAD, undefined, CENTER_X, CENTER_Z, true), [])
  const patches = useMemo(() => PATCHES.map(p => terrainPlane(p.maxX - p.minX, p.maxZ - p.minZ, p.quad, undefined, (p.minX + p.maxX) / 2, (p.minZ + p.maxZ) / 2, false, true)), [])
  const island = useMemo(() => {
    const inside = (x: number, z: number) => Math.abs(x - CENTER_X) < WIDTH / 2 - 0.01 && Math.abs(z - CENTER_Z) < DEPTH / 2 - 0.01
    return terrainPlane(WIDTH + 2 * ISLAND_MARGIN, DEPTH + 2 * ISLAND_MARGIN, ISLAND_QUAD, inside)
  }, [])
  useEffect(() => () => { near.dispose(); patches.forEach(p => p.dispose()); island.dispose(); material.dispose() }, [near, patches, island, material])
  return <>
    <mesh geometry={near} material={material} receiveShadow/>
    {patches.map((p, i) => <mesh key={i} name={i ? 'Cliff-Terrain-Patch' : 'Sunlight-Terrain-Patch'} geometry={p} material={material} receiveShadow/>)}
    <mesh geometry={island} material={material} receiveShadow/>
  </>
}
