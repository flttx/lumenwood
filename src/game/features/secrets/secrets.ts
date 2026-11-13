import type { RouteProgress, SecretId } from '../route/progress'
import { ECHO_ORDER, fordStones, giantMushrooms, seeds } from '../../world/zones/sideLayout'
// Light seeds and side-area secrets (third pass, 2026-11-12; the user found the journey too short). Pure rules over plain
// state, so they are unit-tested; Secrets.tsx applies them each frame and draws the results.
// - Twelve light seeds: nine lie in corners off the trails, three appear when a secret is solved. Each one picked up
//   tells a line of the forest's memory, in the order they are found, and makes the hand lantern a little brighter.
// - Echo stones (glen): the waterfall hums three notes; touch the stones in that order.
// - Giant mushrooms (hollow): stand under each to wake it; all of them raise a column of spores.
// - Ford (lake): step on the stones from the shore to the island in order; a skipped stone resets the ford.
// - Vista (overlook): stand at the cliff edge for a moment.
export const SEED_REACH = 1.4, STONE_REACH = 1.9, MUSHROOM_REACH = 1.8, FORD_REACH = 1.3, VISTA_REACH = 2.6, VISTA_HOLD = 2.5

export interface SecretState { echo: number[]; mushrooms: Set<number>; ford: number }
export const createSecretState = (): SecretState => ({ echo: [], mushrooms: new Set(), ford: 0 })

/** A touched echo stone: the sequence grows while it follows ECHO_ORDER; a wrong stone starts over (counting itself if it
 *  is the first note). */
export function touchEcho(s: SecretState, note: number): 'progress' | 'wrong' | 'solved' {
  if (note === ECHO_ORDER[s.echo.length]) {
    s.echo.push(note)
    if (s.echo.length === ECHO_ORDER.length) { s.echo = []; return 'solved' }
    return 'progress'
  }
  s.echo = note === ECHO_ORDER[0] ? [note] : []
  return 'wrong'
}
/** Wakes giant mushroom `i`; returns 'solved' when the last one wakes, 'woke' for a new one, 'none' if already awake. */
export function wakeMushroom(s: SecretState, i: number): 'woke' | 'solved' | 'none' {
  if (s.mushrooms.has(i)) return 'none'
  s.mushrooms.add(i)
  return s.mushrooms.size === giantMushrooms.length ? 'solved' : 'woke'
}
/** Stands on ford stone `i`: the next stone advances the ford, an earlier one is harmless, skipping ahead starts over. */
export function stepFord(s: SecretState, i: number): 'progress' | 'reset' | 'solved' | 'none' {
  if (i < s.ford) return 'none'
  if (i === s.ford) { s.ford++; return s.ford === fordStones.length ? 'solved' : 'progress' }
  s.ford = i === 0 ? 1 : 0
  return 'reset'
}
/** Marks a secret solved once; returns true the first time. */
export function solve(p: RouteProgress, id: SecretId, now: number) {
  if (p.secretsAt.has(id)) return false
  p.secretsAt.set(id, now)
  return true
}
/** A seed shows once its secret (if any) is solved and until it is picked up. */
export function seedAvailable(p: RouteProgress, i: number) {
  const secret = seeds[i].secret
  return !p.seedsAt.has(i) && (!secret || p.secretsAt.has(secret))
}
/** Picks up seed `i` if available; returns the memory line to show, or null. */
export function collectSeed(p: RouteProgress, i: number, now: number) {
  if (!seedAvailable(p, i)) return null
  p.seedsAt.set(i, now)
  return memories[Math.min(p.seedsAt.size, memories.length) - 1]
}
/** The forest's memory, one line per seed in the order they are found; the last line only with all twelve. */
export const memories = [
  '种子里有一段很久以前的风声：那时，森林每晚都会亮起来。',
  '古树曾为每一个迷路的小生灵，留着一盏灯。',
  '拾光者的帽子，是古树落下的第一颗松果。',
  '萤火记得每一条小路，只是在等人陪它们再走一遍。',
  '瀑布后的回声说：倾听，总比寻找早一步。',
  '蘑菇在黑暗里发光，是为了让后来的人不害怕。',
  '湖面映出的不是星星，是很多年前点过的灯。',
  '从高处看，森林像一盏还没点亮的灯笼。',
  '有人在木屋的窗台上，留过一束晒干的花。',
  '风把种子吹到最远的角落——那里也该有光。',
  '湿地的青蛙唱的，是古树教给它们的歌。',
  '十二颗种子都回来了。森林会记得你。',
] as const
/** Hand lantern brightness multiplier for `found` seeds (up to +60 % with all twelve). */
export const lanternBoost = (found: number) => 1 + 0.6 * Math.min(1, found / seeds.length)
