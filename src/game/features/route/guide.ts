import { flowers } from '../../world/zones/floraLayout'
import { GLADE_CENTRE } from '../../world/zones/wetlandLayout'
import { highlandPath } from '../../world/zones/highlandLayout'
import { LANTERN_COST, lanterns, routeEnds, zoneLanterns, type Zone } from './routeLayout'
import type { RouteProgress } from './progress'
// World guidance (P4): one-line captions at first-time moments, and a gentle pulse on the next thing to do when the player
// has made no progress for a while. Both are suggestions; nothing is forced. Texts are provisional.
export const captions = {
  start: '靠近发光的花朵，看看它会怎样回应你。',
  firstFirefly: '萤火会跟着你。带上它们，去点亮林径旁的灯笼。',
  short: '这盏灯还需要更多萤火——找找还没醒来的花。',
  firstLit: '灯亮了。把这一带的灯都点亮吧。',
  campDone: '萤火流向北方，迷雾正在散去。',
  wetland: '浅水可以涉过，深水要绕开。',
  bridge: '光桥铺好了，去对岸看看。',
  glade: '光柱指向更高的地方。',
  highland: '古树在等待。点亮它周围的石灯座。',
  cradle1: '古树的根亮了。',
  cradle2: '光沿着树干升起。',
} as const
export type CaptionId = keyof typeof captions
/** Seconds without progress before the next target is pulsed, and between repeated pulses. */
export const HINT_AFTER = 40

/** Which route zone the player is in, by how far north they are (the glade counts as the wetlands). */
export function zoneAt(z: number): Zone { return z < 22 ? 'camp' : z < 75 ? 'wetland' : 'highland' }

const nearest = <T extends { x: number; z: number }>(items: T[], x: number, z: number) =>
  items.reduce<T | null>((best, s) => (!best || Math.hypot(s.x - x, s.z - z) < Math.hypot(best.x - x, best.z - z) ? s : best), null)

/**
 * The next thing worth doing in the player's zone: a sleeping flower while they carry too few fireflies, otherwise the
 * nearest dark node; once the zone is done, the way onward. Null when there is nothing left to point at.
 */
export function hintTarget(p: RouteProgress, x: number, z: number): { x: number; z: number } | null {
  const zone = zoneAt(z)
  if (p.completedAt[zone] !== null) {
    if (zone === 'camp') return { x: routeEnds.camp[0], z: routeEnds.camp[1] }
    if (zone === 'wetland') return p.finaleAt === null ? { x: GLADE_CENTRE[0], z: GLADE_CENTRE[1] } : { x: highlandPath[1][0], z: highlandPath[1][1] }
    return null
  }
  const dark = zoneLanterns(zone).filter(i => p.litAt[i] === null).map(i => lanterns[i])
  const sleeping = flowers.filter((f, i) => f.zone === zone && !p.released.has(i))
  if (p.carried < LANTERN_COST && sleeping.length) return nearest(sleeping, x, z)
  return nearest(dark, x, z)
}
