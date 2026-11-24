import { ASCENT, BEACH, BRIDGE, CAMP, EAST_RIDGE_TRAIL, GLADE, GLEN, GLEN_LAKE_TRAIL, GLEN_PASS, HIGHLAND, HOLLOW, HOLLOW_PASS, HOLLOW_VALE_TRAIL, LAKE, LAKE_PASS, NORTH_CORRIDOR, OVERLOOK, OVERLOOK_PASS, REEF, REEF_CAUSEWAY, STAR_CLIFF, STAR_PASS, VALE, VALE_PASS, WETLAND, rectDistance, type Rect } from '../../world/regions'
import { flowers } from '../../world/zones/floraLayout'
import { GLADE_CENTRE } from '../../world/zones/wetlandLayout'
import { seeds } from '../../world/zones/sideLayout'
import { ascentOpen, gateOpen, type RouteProgress } from './progress'
import { LANTERN_COST, lanterns, zoneLanterns, type Zone } from './routeLayout'

export interface NavigationTarget { x: number; z: number }
export interface RouteObjective {
  id: string; title: string; detail: string; progress: string
  target: NavigationTarget | null
  actionHint?: string
  alternateHint?: string
}
export interface NavigationHud extends Omit<RouteObjective, 'target'> {
  distance: number | null; angle: number; direction: string
}
/** Frame-loop-owned focus shared by the HUD driver and the existing world-space hint. */
export const navigationFocus: { target: NavigationTarget | null } = { target: null }
const names: Record<Zone, string> = { camp: '林间营地', wetland: '萤光湿地', highland: '古树高地' }
const middle = (r: Rect) => (r.minX + r.maxX) / 2
const within = (x: number, z: number, r: Rect) => rectDistance(x, z, r) === 0

/** Return through a side area's pass (or loop exit toward the active zone) instead of pointing across enclosing hills. */
function sideExit(x: number, z: number, zone: Zone): NavigationTarget | null {
  if (within(x, z, GLEN) || within(x, z, GLEN_PASS)) return { x: x < GLEN.maxX - 2 ? GLEN.maxX - 1 : CAMP.minX + 3, z: (GLEN_PASS.minZ + GLEN_PASS.maxZ) / 2 }
  if (within(x, z, HOLLOW) || within(x, z, HOLLOW_PASS)) return { x: x > HOLLOW.minX + 2 ? HOLLOW.minX + 1 : CAMP.maxX - 3, z: (HOLLOW_PASS.minZ + HOLLOW_PASS.maxZ) / 2 }
  if (within(x, z, LAKE) || within(x, z, LAKE_PASS)) return { x: x < LAKE.maxX - 2 ? LAKE.maxX - 1 : WETLAND.minX + 3, z: (LAKE_PASS.minZ + LAKE_PASS.maxZ) / 2 }
  if (within(x, z, OVERLOOK) || within(x, z, OVERLOOK_PASS)) return { x: x > OVERLOOK.minX + 2 ? OVERLOOK.minX + 1 : HIGHLAND.maxX - 3, z: (OVERLOOK_PASS.minZ + OVERLOOK_PASS.maxZ) / 2 }
  if (within(x, z, VALE) || within(x, z, VALE_PASS)) return { x: x > VALE.minX + 2 ? VALE.minX + 1 : WETLAND.maxX - 3, z: (VALE_PASS.minZ + VALE_PASS.maxZ) / 2 }
  if (within(x, z, REEF) || within(x, z, REEF_CAUSEWAY)) return { x: 0, z: BEACH.minZ + 2 }
  if (within(x, z, BEACH) && z < CAMP.minZ) return { x: 0, z: CAMP.minZ + 3 }
  if (within(x, z, STAR_CLIFF) || within(x, z, STAR_PASS)) return { x: middle(STAR_PASS), z: HIGHLAND.maxZ - 4 }
  if (within(x, z, GLEN_LAKE_TRAIL)) return { x: middle(GLEN_LAKE_TRAIL), z: zone === 'camp' ? GLEN.maxZ - 4 : LAKE.minZ + 4 }
  if (within(x, z, HOLLOW_VALE_TRAIL)) return zone === 'camp' ? { x: middle(HOLLOW_VALE_TRAIL), z: HOLLOW.maxZ - 4 } : { x: VALE.maxX - 6, z: VALE.minZ + 6 }
  if (within(x, z, EAST_RIDGE_TRAIL)) return { x: middle(EAST_RIDGE_TRAIL), z: zone === 'highland' ? OVERLOOK.minZ + 6 : VALE.maxZ - 4 }
  return null
}

/** Main-route instruction and a local waypoint. Nearby action targets stay selected until used, so the arrow does not
 * switch flowers simply because the player walked between two candidates. This is guidance, not obstacle pathfinding. */
export function routeObjective(p: RouteProgress, x: number, z: number, now: number, previousId = ''): RouteObjective {
  if (p.completedAt.highland !== null) return { id: 'explore', title: '森林已被点亮，自由探索吧', detail: '寻找光之种子，或回到喜欢的地方。', progress: `光之种子 ${p.seedsAt.size}/${seeds.length}`, target: null }
  const zone: Zone = p.completedAt.camp === null ? 'camp' : p.completedAt.wetland === null ? 'wetland' : 'highland'
  const nodes = zoneLanterns(zone), lit = nodes.filter(i => p.litAt[i] !== null).length
  const progress = `${names[zone]} · 灯火 ${lit}/${nodes.length}`
  const travel = (id: string, title: string, detail: string, target: NavigationTarget | null): RouteObjective => ({ id, title, detail, progress, target })
  const exit = sideExit(x, z, zone)
  if (exit) return travel('return-main', '沿山口返回主线林径', `支线可以随时探索；主线在${names[zone]}。`, exit)
  if (zone !== 'camp' && z < WETLAND.minZ + 2) {
    const open = gateOpen(p, 'camp', now)
    return travel('to-wetland', open ? '沿北侧林径前往萤光湿地' : '萤火正在驱散北侧迷雾', open ? '顺着林径穿过山口，继续向前。' : '稍等片刻，道路即将打开。',
      { x: middle(NORTH_CORRIDOR), z: !open ? CAMP.maxZ - 2 : z < NORTH_CORRIDOR.minZ + 1 ? NORTH_CORRIDOR.minZ + 3 : WETLAND.minZ + 3 })
  }
  if (zone === 'highland' && z < GLADE.minZ + 2) {
    const open = gateOpen(p, 'wetland', now)
    return travel('to-glade', open ? '走过光桥，进入对岸空地' : '萤火正在铺成光桥', open ? '沿着发光桥面走到对岸。' : '三盏湿地灯火已亮，稍等光桥铺好。',
      { x: middle(BRIDGE), z: !open ? BRIDGE.minZ - 2 : z < BRIDGE.minZ + 1 ? BRIDGE.minZ + 3 : GLADE_CENTRE[1] })
  }
  if (zone === 'highland' && p.finaleAt === null) return travel('glade-heart', '走进空地，让萤火汇聚', '靠近空地中央的光。', { x: GLADE_CENTRE[0], z: GLADE_CENTRE[1] })
  if (zone === 'highland' && z < HIGHLAND.minZ + 2) {
    const open = ascentOpen(p, now)
    return travel('to-highland', open ? '沿北侧坡道前往古树高地' : '萤火正在打开通往高地的道路', open ? '顺着坡道向上，古树就在前方。' : '稍等光柱升起，北侧迷雾便会散去。',
      { x: middle(ASCENT), z: !open ? GLADE.maxZ - 2 : z < ASCENT.minZ + 1 ? ASCENT.minZ + 3 : HIGHLAND.minZ + 3 })
  }
  const candidates = p.carried < LANTERN_COST
    ? flowers.flatMap((f, i) => f.zone === zone && !p.released.has(i) ? [{ id: `flower-${i}`, x: f.x, z: f.z }] : [])
    : (zone === 'highland' ? nodes.filter(i => p.litAt[i] === null).slice(0, 1) : nodes).flatMap(i => p.litAt[i] === null ? [{ id: `lantern-${i}`, x: lanterns[i].x, z: lanterns[i].z }] : [])
  // A new journey opens looking toward flower 0; favour that visible first interaction over a slightly nearer one behind.
  const preferred = previousId || (zone === 'camp' && p.released.size === 0 && Math.hypot(x, z) < 5 ? 'flower-0' : '')
  const selected = candidates.find(t => t.id === preferred) ?? candidates.reduce<(typeof candidates)[number] | null>((best, t) =>
    !best || Math.hypot(t.x - x, t.z - z) < Math.hypot(best.x - x, best.z - z) ? t : best, null)
  if (p.carried < LANTERN_COST) return travel(selected?.id ?? 'flowers', '靠近发光花，收集萤火',
    `再唤醒 ${LANTERN_COST - p.carried} 朵花，就能点亮一盏${zone === 'highland' ? '石灯座' : '灯笼'}。`, selected)
  if (zone === 'highland') return { ...travel(selected?.id ?? 'lanterns', '循着光脉，前往下一座石灯座', `已有 ${p.carried} 只萤火；依次连接根部、树干和树冠。`, selected), actionHint: '灯座旁面向古树，按住 E' }
  return travel(selected?.id ?? 'lanterns', '带着萤火，靠近未亮的灯笼', `已有 ${p.carried} 只萤火；靠近后会自动点亮，消耗 ${LANTERN_COST} 只。`, selected)
}

/** Signed bearing relative to the view: positive is screen-right; round to 10 degrees to avoid noisy HUD updates. */
export function targetBearing(dx: number, dz: number, forwardX: number, forwardZ: number) {
  return Math.round(Math.atan2(forwardX * dz - forwardZ * dx, forwardX * dx + forwardZ * dz) * 180 / Math.PI / 10) * 10
}
export function directionLabel(angle: number) {
  return Math.abs(angle) >= 150 ? '目标在身后，转身看看' : angle > 25 ? '目标在右侧' : angle < -25 ? '目标在左侧' : '目标就在前方'
}
