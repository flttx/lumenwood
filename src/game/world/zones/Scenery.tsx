import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Mesh, MeshStandardMaterial } from 'three'
import { assetConfig } from '../../assets/config'
import { Scatter } from '../../rendering/Scatter'
import { atmosphere } from '../../rendering/timeOfDay'
import type { ScatterItem } from '../../rendering/scatterChunks'
import { BRIDGE_BASE, fences, ferns, footbridges, logs, mossStones, mushrooms, reeds, shrubs, signposts, steppingStones, stumps, wildflowers } from './sceneryLayout'
import { campCrates, campSeats, campfire, woodpile } from './campLayout'
import { CampfireEffects } from './Campfire'
import { heightAt } from '../terrain/terrain'
// Scenery from the scene-upgrade Meshy batch (docs/ASSET_MANIFEST.md): undergrowth, props and small structures, each a
// chunked instanced layer (rendering/Scatter) drawn only near the camera. Layouts live in sceneryLayout.ts.
const url = (folder: string, id: string) => `${assetConfig.baseUrl}models/${folder}/${id}.glb`
interface Layer { id: string; folder: string; items: readonly ScatterItem[]; maxDistance: number; castShadow?: boolean; lods?: string[]; foliage?: { sway: number } }
const PLANT = { sway: 0.05 }, SHRUB = { sway: 0.025 }
// Ferns and mushrooms carry a decimated LOD1 (scripts/blender/optimize_tree.py) used beyond NEAR_DETAIL metres.
const NEAR_DETAIL = 12
const bridgeItems = footbridges.map(b => ({ x: b.x, y: BRIDGE_BASE, z: b.z, angle: b.angle, scale: 1 })) // sceneryLayout.deckHeight assumes this
const placed = (p: { x: number; z: number; angle: number }, scale = 1): ScatterItem => ({ x: p.x, y: heightAt(p.x, p.z), z: p.z, angle: p.angle, scale })
// Seats round the fire are small VEG-012 stumps.
const stumpItems = [...stumps, ...campSeats.map(s => placed(s, 0.5))]
const layers: Layer[] = [
  { id: 'VEG-006', folder: 'vegetation', items: ferns, maxDistance: 40, lods: ['VEG-006_LOD0', 'VEG-006_LOD1'], foliage: PLANT },
  { id: 'PRP-002', folder: 'props', items: mossStones, maxDistance: 55 },
  { id: 'VEG-005', folder: 'vegetation', items: logs, maxDistance: 120, castShadow: true },
  { id: 'VEG-008', folder: 'vegetation', items: reeds, maxDistance: 50, foliage: PLANT },
  { id: 'PRP-003', folder: 'props', items: steppingStones, maxDistance: 55 },
  { id: 'ARC-003', folder: 'architecture', items: fences, maxDistance: 80, castShadow: true },
  { id: 'ARC-002', folder: 'architecture', items: bridgeItems, maxDistance: 160, castShadow: true },
  // Scene enrichment (2026-11-12).
  { id: 'VEG-010', folder: 'vegetation', items: shrubs, maxDistance: 60, castShadow: true, lods: ['VEG-010_LOD0', 'VEG-010_LOD1'], foliage: SHRUB },
  { id: 'VEG-011', folder: 'vegetation', items: wildflowers, maxDistance: 38, lods: ['VEG-011_LOD0', 'VEG-011_LOD1'], foliage: PLANT },
  { id: 'VEG-012', folder: 'vegetation', items: stumpItems, maxDistance: 70, castShadow: true },
  { id: 'PRP-004', folder: 'props', items: [placed(campfire)], maxDistance: 90, castShadow: true },
  { id: 'PRP-005', folder: 'props', items: [placed(campCrates)], maxDistance: 90, castShadow: true },
  { id: 'PRP-006', folder: 'props', items: signposts, maxDistance: 90, castShadow: true },
  { id: 'PRP-007', folder: 'props', items: [placed(woodpile)], maxDistance: 90, castShadow: true },
]
const MUSHROOM_URL = url('vegetation', 'VEG-007')
for (const l of layers) useGLTF.preload(url(l.folder, l.id), false, false)
useGLTF.preload(MUSHROOM_URL, false, false)

/** VEG-007's Emission map lights the caps' undersides; like the flowers, they glow brighter once the sun is down. */
function Mushrooms() {
  const { scene } = useGLTF(MUSHROOM_URL, false, false)
  const material = useMemo(() => {
    const mesh = scene.getObjectByName('VEG-007_LOD0')
    if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshStandardMaterial)) throw new Error(`${MUSHROOM_URL} has no standard mesh named VEG-007_LOD0`)
    return mesh.material
  }, [scene])
  useFrame(() => { material.emissiveIntensity = 0.35 + 1.1 * atmosphere.preset.fireflies })
  return <Scatter url={MUSHROOM_URL} lods={['VEG-007_LOD0', 'VEG-007_LOD1']} items={mushrooms} chunkSize={24} lodDistance={NEAR_DETAIL} maxDistance={40}/>
}

export function Scenery() {
  return <>
    {layers.map(l => <Scatter key={l.id} url={url(l.folder, l.id)} lods={l.lods ?? [l.id]} items={l.items} chunkSize={24} lodDistance={NEAR_DETAIL} maxDistance={l.maxDistance} castShadow={l.castShadow} foliage={l.foliage}/>)}
    <Mushrooms/>
    <CampfireEffects x={campfire.x} y={heightAt(campfire.x, campfire.z)} z={campfire.z}/>
  </>
}
