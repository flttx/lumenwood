import { Scatter } from '../../rendering/Scatter'
import { assetConfig } from '../../assets/config'
import type { ScatterItem } from '../../rendering/scatterChunks'
import { groundUnder, heightAt } from '../../world/terrain/terrain'
import { sunRavineGap } from './landform'

const model = (folder: string, id: string) => `${assetConfig.baseUrl}models/${folder}/${id}.glb`
const placed = (x: number, z: number, scale: number, angle: number, sink = 0): ScatterItem => ({ x, z, y: heightAt(x, z) - sink, scale, angle })
// Existing Meshy moss stones sit down the inaccessible slope, below the optical ray. Low bank plants frame the gap
// without hiding either mirror, the bridge mouth or the seed. These are dressing, never extra light-path obstacles.
const rocks = [[17.9, -8, 0.8], [17.4, -3, 1.1], [18.5, 2, 0.8], [21, 5, 1], [25.5, 5.3, 0.9], [29.8, 2.5, 1.1], [30.6, -3, 1], [29.2, -8, 0.9], [27, -11, 0.65], [20.2, -10.8, 0.65]]
  .filter(([x, z]) => sunRavineGap(x, z) > 0.25).map(([x, z, scale], i) => ({ ...placed(x, z, scale, i * 2.399), y: groundUnder(x, z, 0.85 * scale) - 0.1 }))
const outcrops = [[19, -4.5, 0.82], [19.1, -0.8, 0.75], [20.1, 3.1, 0.8], [25, 4.7, 0.8], [28.7, 0.2, 0.85], [28.3, -4.6, 0.8], [18.1, -7.8, 0.9], [29.6, -7.7, 0.85]]
  .filter(([x, z]) => sunRavineGap(x, z) > 0.25).map(([x, z, scale], i) => {
    const item = { ...placed(x, z, scale, i * 1.7), y: groundUnder(x, z, 0.95 * scale) - 0.12 }
    // Keep each uppermost vertex below the bank: these break the slope's silhouette, never the walkable surface.
    item.y = Math.min(item.y, -0.12 - 1.4 * scale)
    return item
  })
const ferns = [[15.6, -8], [15.5, -3], [16, 2], [18.8, 6.4], [23, 8.6], [29, 6], [32, 1], [32, -5], [30.2, -10.5], [28.6, -13], [20.6, -4.4], [27.2, -3], [20.7, 0.6], [26.5, 2], [14.9, -12.3], [10.3, -8.4]]
  .filter(([x, z]) => sunRavineGap(x, z) < -0.4).map(([x, z], i) => placed(x, z, 0.75 + (i % 3) * 0.13, i * 2.399))
const flowers = [[10.2, -19.2], [16.6, -18.8], [28.8, -18.4], [31.8, -9], [18, 5.8], [26.5, 7.8]]
  .filter(([x, z]) => sunRavineGap(x, z) < -0.4).map(([x, z], i) => placed(x, z, 0.7 + i % 2 * 0.2, i * 2.399))
const foliage = { sway: 0.04, cameraFade: true }
const ROCK_LODS = ['PRP-002'], OUTCROP_LODS = ['PRP-001']
const FERN_LODS = ['VEG-006_LOD0', 'VEG-006_LOD1'], FLOWER_LODS = ['VEG-011_LOD0', 'VEG-011_LOD1']
export function SunlightBanks() {
  return <group name="Sunlight-Meshy-Bank-Dressing">
    <Scatter url={model('props', 'PRP-002')} lods={ROCK_LODS} items={rocks} maxDistance={65} castShadow/>
    <Scatter url={model('props', 'PRP-001')} lods={OUTCROP_LODS} items={outcrops} maxDistance={70} castShadow/>
    <Scatter url={model('vegetation', 'VEG-006')} lods={FERN_LODS} items={ferns} maxDistance={45} lodDistance={20} foliage={foliage}/>
    <Scatter url={model('vegetation', 'VEG-011')} lods={FLOWER_LODS} items={flowers} maxDistance={40} lodDistance={18} foliage={foliage}/>
  </group>
}
