import { BEACH, GLEN, HOLLOW, LAKE, OVERLOOK, rectDistance } from '../../world/regions'
import { HOLLOW_HEART, VISTA_POINT, fordStones, giantMushrooms, seeds } from '../../world/zones/sideLayout'
import type { RouteProgress, SecretId } from '../route/progress'
import type { RouteObjective } from '../route/navigation'
import type { SecretState } from './secrets'

const areas = [['glen', GLEN], ['hollow', HOLLOW], ['lake', LAKE], ['overlook', OVERLOOK], ['beach', BEACH]] as const
export const sideAreaAt = (x: number, z: number) => areas.find(([, r]) => rectDistance(x, z, r) === 0)?.[0] ?? null
const names = { glen: '瀑布溪谷', hollow: '蘑菇幽谷', lake: '镜湖', overlook: '悬崖眺望台', beach: '月牙海湾' }
export function sideObjective(p: RouteProgress, x: number, z: number, state: SecretState): RouteObjective | null {
  const area = sideAreaAt(x, z)
  if (!area) return null
  const make = (title: string, detail: string, target: { x: number; z: number } | null, progress = '此地的线索'): RouteObjective =>
    ({ id: `side-${area}`, title, detail, target, progress: `${names[area]} · ${progress}`, actionHint: '探索此地', alternateHint: p.completedAt.highland === null ? '按 T 查看主线方向' : '按 T 查看森林总览' })
  if (area === 'beach') return make(p.seedsAt.has(9) ? '海湾的光之种子已找到' : '沿着海湾寻找留下的微光', '可以自由探索；主线方向随时可查看。', null, p.seedsAt.has(9) ? '种子已找到' : '自由探索')
  if (p.secretsAt.has(area as SecretId)) {
    const reward = seeds.findIndex(s => s.secret === area)
    if (reward >= 0 && !p.seedsAt.has(reward)) return make('循着新出现的光，取回种子', '此地的秘密已经解开。', seeds[reward], '秘密已解开')
    return make('此地的秘密已解开', '继续看看周围，或按 T 查看主线方向。', null, '秘密已解开')
  }
  if (area === 'glen') return make('倾听瀑布，再回应三块回声石', '听清三声的先后，再靠近石头；按错后可以重新倾听。', Math.hypot(x + 113, z - 8) > 15 ? { x: -113, z: 8 } : null, `回声 ${state.echo.length}/3`)
  if (area === 'hollow') {
    const sleeping = giantMushrooms.filter((_, i) => !state.mushrooms.has(i))
    const target = sleeping.reduce<(typeof sleeping)[number] | null>((best, m) => !best || Math.hypot(m.x - x, m.z - z) < Math.hypot(best.x - x, best.z - z) ? m : best, null)
    return make('走到巨型蘑菇的伞盖下', '让每一丛沉睡的蘑菇都回应你。', target ?? { x: HOLLOW_HEART[0], z: HOLLOW_HEART[1] }, `已唤醒 ${state.mushrooms.size}/${giantMushrooms.length}`)
  }
  if (area === 'lake') return make(state.ford ? '沿发亮的踏石继续前行' : '从东岸踏上第一块踏石', '一块接一块地走向湖心，跳过踏石需要重新开始。', fordStones[Math.min(state.ford, fordStones.length - 1)], `踏石 ${state.ford}/${fordStones.length}`)
  return make('在崖边站定，看看远方', '在眺望处停留片刻，让森林回应你。', { x: VISTA_POINT[0], z: VISTA_POINT[1] })
}
