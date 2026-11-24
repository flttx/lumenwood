import type { RouteProgress } from '../route/progress'
import type { RouteObjective } from '../route/navigation'
import { inSunRect, SUN_BRIDGE, SUN_ISLAND, SUN_MIRRORS, SUN_PLANT, SUN_REWARD } from './layout'
import { hasDaylight, traceSunlight } from './progress'

/** Local introduction: an advanced save is never sent back to camp. */
export function sunlightObjective(p: RouteProgress, x: number, z: number, time: number): RouteObjective | null {
  const s = p.sunlight
  const make = (id: string, title: string, detail: string, target: { x: number; z: number }, actionHint = '走向光路空地'): RouteObjective =>
    ({ id: `sun-${id}`, title, detail, target, actionHint, progress: '借光生长 · 玩法样板（临时美术）' })
  if (s.crossed && x > 18 && z <= -14.5 && z > -18) return make('bank', '沿岸边返回营地', '从沟壑南侧绕回林径。', { x: 14, z: -16 }, '沿安全岸边前行')
  if (s.grownAt !== null && x > 18 && x < 30 && z > -14.5 && z < 5) {
    if (!s.crossed) return make('reward', '走过藤桥，取回光之种子', '你借来的阳光已让藤蔓长成通路。', z < -5.5 ? { x: SUN_BRIDGE.x, z: -4.5 } : SUN_REWARD, '沿藤桥前行')
    return make('return', '沿藤桥回到营地', '营地里的萤火正等待你。', z > -5 ? { x: SUN_BRIDGE.x, z: -5 } : { x: SUN_BRIDGE.x, z: -15 }, '沿藤桥返回')
  }
  if (s.crossed || p.litAt.some(t => t !== null) || !inSunRect(x, z, { minX: -15, maxX: 42, minZ: -38, maxZ: 28 })) return null
  if (s.grownAt !== null) return make('bridge', '踏上新长出的藤桥', '从两座日光镜之间，走向对岸的种子。', { x: SUN_BRIDGE.x, z: -13.6 }, '走上藤桥')
  if (!hasDaylight(time)) return null
  const path = traceSunlight(s.steps, true)
  if (path.receiver) return make('grow', '让阳光继续照着嫩芽', `藤蔓正在生长 · ${Math.floor(s.growth * 100)}%`, SUN_PLANT, '保持光路')
  if (path.relay) return make('second', '转动第二座镜，把阳光送到嫩芽', '顺着光束观察落点；让光越过沟壑。', SUN_MIRRORS[1], '靠近后按 E / Q 转动')
  return make('first', '借一束阳光，唤醒对岸的嫩芽', '先转动第一座日光镜，把光送到另一座镜上。', SUN_MIRRORS[0], '靠近后按 E / Q 转动')
}
export function onSunIsland(x: number, z: number) { return inSunRect(x, z, SUN_ISLAND, -0.45) }
