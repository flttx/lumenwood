import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import { assetConfig } from '../../assets/config'
import { forestTrees, outerTrees, treeBase, type TreeKind } from './forestLayout'
import { Ground } from '../terrain/Ground'
import { Scatter } from '../../rendering/Scatter'
import { LOD1_DISTANCE } from './treeLod'
import { Cabin } from './Cabin'
import { Highland } from './Highland'
import { Scenery } from './Scenery'
// Tree species (docs/ASSET_MANIFEST.md): VEG-001 young conifers, VEG-003 giant redwoods, VEG-004 tall firs, VEG-009 birches. Each GLB holds
// LOD0 and LOD1 meshes sharing one material. Trees are chunked (rendering/Scatter): whole chunks are frustum-culled and
// switch LOD by distance; collision and occlusion stay on code proxies (forestLayout).
const MODELS: Record<TreeKind, { url: string; lods: string[]; lodDistance: number }> = {
  conifer: { url: `${assetConfig.baseUrl}models/vegetation/VEG-001.glb`, lods: ['VEG-001_LOD0', 'VEG-001_LOD1'], lodDistance: LOD1_DISTANCE },
  redwood: { url: `${assetConfig.baseUrl}models/vegetation/VEG-003.glb`, lods: ['VEG-003_LOD0', 'VEG-003_LOD1'], lodDistance: 26 },
  fir: { url: `${assetConfig.baseUrl}models/vegetation/VEG-004.glb`, lods: ['VEG-004_LOD0', 'VEG-004_LOD1'], lodDistance: 20 },
  birch: { url: `${assetConfig.baseUrl}models/vegetation/VEG-009.glb`, lods: ['VEG-009_LOD0', 'VEG-009_LOD1'], lodDistance: 22 },
}
const KINDS = Object.keys(MODELS) as TreeKind[]
const VIEW_DISTANCE = 190, TREE_CHUNK = 20
// Tall trees sway a little at the crown; the shared object keeps Scatter's memo stable.
const TREE_FOLIAGE = { sway: 0.006 }
const byKind = (kind: TreeKind) => forestTrees.flatMap((t, i) => t.kind === kind ? [{ x: t.x, y: treeBase(t), z: t.z, angle: i * 2.39996, scale: t.scale }] : [])
const playable = Object.fromEntries(KINDS.map(k => [k, byKind(k)])) as Record<TreeKind, ReturnType<typeof byKind>>
const backdrop = Object.fromEntries(KINDS.map(k => [k, outerTrees.flatMap((t, i) => t.kind === k ? [{ x: t.x, y: t.y, z: t.z, angle: i * 1.7, scale: t.scale }] : [])])) as Record<TreeKind, ReturnType<typeof byKind>>
// The files use neither Draco nor meshopt; skipping both keeps the build free of CDN decoder requests.
for (const k of KINDS) useGLTF.preload(MODELS[k].url, false, false)

function Trees() {
  return <>{KINDS.map(k => <group key={k}>
    {playable[k].length > 0 && <Scatter url={MODELS[k].url} lods={MODELS[k].lods} items={playable[k]} chunkSize={TREE_CHUNK} lodDistance={MODELS[k].lodDistance} maxDistance={VIEW_DISTANCE} castShadow foliage={TREE_FOLIAGE}/>}
    {/* Backdrop trees are always far from the camera, so they use LOD1 only. */}
    {backdrop[k].length > 0 && <Scatter url={MODELS[k].url} lods={MODELS[k].lods.slice(1)} items={backdrop[k]} chunkSize={48} maxDistance={VIEW_DISTANCE} receiveShadow={false} foliage={TREE_FOLIAGE}/>}
  </group>)}</>
}

export function Forest() {
  // Trees and the cabin appear once their models have loaded.
  return <><Ground/>
    <Suspense fallback={null}><Trees/><Cabin/><Highland/><Scenery/></Suspense>
  </>
}
