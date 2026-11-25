import { BEACH, EAST_COVE_WOODS, GLEN, GLEN_PASS, HOLLOW, HOLLOW_PASS, LAKE, LAKE_PASS, OVERLOOK, OVERLOOK_PASS, REEF, REEF_CAUSEWAY, STAR_CLIFF, STAR_PASS, VALE, VALE_PASS, WEST_COVE_WOODS, rectDistance, type Rect } from '../../world/regions'
import { HOLLOW_HEART, VISTA_POINT, fordStones, giantMushrooms, reefCairns, seeds, valeStones } from '../../world/zones/sideLayout'
import type { RouteProgress, SecretId } from '../route/progress'
import type { RouteObjective } from '../route/navigation'
import { VALE_HOLD, activeValeCount, type SecretState } from './secrets'

type SideArea = SecretId | 'beach' | 'starcliff'
const areas: readonly (readonly [SideArea, Rect])[] = [
  ['glen', GLEN], ['glen', GLEN_PASS],
  ['hollow', HOLLOW], ['hollow', HOLLOW_PASS],
  ['lake', LAKE], ['lake', LAKE_PASS],
  ['overlook', OVERLOOK], ['overlook', OVERLOOK_PASS],
  ['beach', BEACH], ['beach', WEST_COVE_WOODS], ['beach', EAST_COVE_WOODS],
  ['vale', VALE], ['vale', VALE_PASS],
  ['reef', REEF], ['reef', REEF_CAUSEWAY],
  ['starcliff', STAR_CLIFF], ['starcliff', STAR_PASS],
]
const areaRects: Record<SideArea, Rect> = { glen: GLEN, hollow: HOLLOW, lake: LAKE, overlook: OVERLOOK, beach: BEACH, vale: VALE, reef: REEF, starcliff: STAR_CLIFF }
export const sideAreaAt = (x: number, z: number): SideArea | null => areas.find(([, r]) => rectDistance(x, z, r) === 0)?.[0] ?? null
const names: Record<SideArea, string> = {
  glen: '瀑布溪谷', hollow: '蘑菇幽谷', lake: '镜湖', overlook: '悬崖眺望台', beach: '月牙海湾',
  vale: '阳石林谷', reef: '望海石台', starcliff: '北崖星台',
}
export function sideObjective(p: RouteProgress, x: number, z: number, state: SecretState, now = 0): RouteObjective | null {
  const area = sideAreaAt(x, z)
  if (!area) return null
  const make = (title: string, detail: string, target: { x: number; z: number } | null, progress = '此地的线索', id = `side-${area}`): RouteObjective =>
    ({ id, title, detail, target, progress: `${names[area]} · ${progress}`, actionHint: '探索此地', alternateHint: p.completedAt.highland === null ? '按 T 查看主线方向' : '按 T 查看森林总览' })
  if (area === 'beach') return make(p.seedsAt.has(9) ? '海湾的光之种子已找到' : '沿着海湾寻找留下的微光', '可以自由探索；主线方向随时可查看。', null, p.seedsAt.has(9) ? '种子已找到' : '自由探索')
  if (area === 'starcliff') {
    const starSeed = 15
    if (!p.seedsAt.has(starSeed)) return make('沿着星台看看北方的海面与夜空', '此地还藏着一颗微光，也可以按 E 望向古树与海面。', seeds[starSeed], '自由探索')
    return make('北崖的光之种子已找到', '可以按 E 望向古树与海面，或按 T 查看森林总览。', null, '种子已找到')
  }
  if (p.secretsAt.has(area)) {
    const reward = seeds.findIndex(s => s.secret === area)
    if (reward >= 0 && !p.seedsAt.has(reward)) return make('循着新出现的光，取回种子', '此地的秘境已经解开。', seeds[reward], '秘境已解开', `side-${area}-reward`)
    const extra = seeds.reduce((n, s, i) => n + (!s.secret && !p.seedsAt.has(i) && rectDistance(s.x, s.z, areaRects[area]) === 0 ? 1 : 0), 0)
    return make('此地的秘境已解开', extra > 0 ? `此地还有 ${extra} 颗光之种子，或按 T 查看主线方向。` : '继续看看周围，或按 T 查看主线方向。', null, '秘境已解开')
  }
  if (area === 'glen') return make('倾听瀑布，再回应三块回声石', '听清三声的先后，再靠近石头；按错后可以重新倾听。', Math.hypot(x + 113, z - 8) > 20 ? { x: -113, z: 8 } : null, `回声 ${state.echo.length}/3`)
  if (area === 'hollow') {
    const sleeping = giantMushrooms.filter((_, i) => !state.mushrooms.has(i))
    const target = sleeping.reduce<(typeof sleeping)[number] | null>((best, m) => !best || Math.hypot(m.x - x, m.z - z) < Math.hypot(best.x - x, best.z - z) ? m : best, null)
    return make('走到巨型蘑菇的伞盖下', '让每一丛沉睡的蘑菇都回应你。', target ?? { x: HOLLOW_HEART[0], z: HOLLOW_HEART[1] }, `已唤醒 ${state.mushrooms.size}/${giantMushrooms.length}`)
  }
  if (area === 'lake') return make(state.ford ? '沿发亮的踏石继续前行' : '从东岸踏上第一块踏石', '一块接一块地走向湖心，跳过踏石需要重新开始。', fordStones[Math.min(state.ford, fordStones.length - 1)], `踏石 ${state.ford}/${fordStones.length}`)
  if (area === 'vale') {
    const active = activeValeCount(state, now)
    const inactive = valeStones.filter((_, i) => now - state.valeAt[i] >= VALE_HOLD)
    const pool = inactive.length > 0 ? inactive : valeStones
    const target = pool.reduce<(typeof valeStones)[number] | null>((best, s) => !best || Math.hypot(s.x - x, s.z - z) < Math.hypot(best.x - x, best.z - z) ? s : best, null)
    return make('靠近或按 F 唤醒 4 座阳石柱', '在石头还亮着时，将这 4 座阳石柱一起点亮。', target, `已点亮 ${active}/${valeStones.length}`)
  }
  if (area === 'reef') {
    const dark = reefCairns.filter((_, i) => !state.reef.has(i))
    const target = dark.reduce<(typeof dark)[number] | null>((best, c) => !best || Math.hypot(c.x - x, c.z - z) < Math.hypot(best.x - x, best.z - z) ? c : best, null)
    return make('走过浅湾与踏石，唤醒三座海石', '靠近或按 F 唤光，把海石连成灯火。', target, `海石 ${state.reef.size}/${reefCairns.length}`)
  }
  return make('在崖边站定，看看远方', '在眺望处停留片刻，让森林回应你。', { x: VISTA_POINT[0], z: VISTA_POINT[1] })
}
