import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { soundscape } from '../../audio/engine'
import { cameraMoment } from '../../camera/FollowCamera'
import { heightAt } from '../../world/terrain/terrain'
import { GLEN, HOLLOW, LAKE, OVERLOOK, rectDistance } from '../../world/regions'
import { HOLLOW_HEART, SHRINE, VISTA_POINT, echoStones, ECHO_ORDER, fordStones, giantMushrooms, seeds } from '../../world/zones/sideLayout'
import { PLUNGE_POOL } from '../../world/zones/wetlandLayout'
import { route, routeClock, type SecretId } from '../route/progress'
import { saveRequest } from '../route/save'
import { FORD_REACH, MUSHROOM_REACH, SEED_REACH, STONE_REACH, VISTA_HOLD, VISTA_REACH, collectSeed, createSecretState, seedAvailable, solve, stepFord, touchEcho, wakeMushroom } from './secrets'
import { secretFx } from './fx'
// Applies the side areas' rules each frame (secrets.ts) and drives their look (fx.ts), sounds, captions and the overlook's
// camera moment. Puzzle progress inside an area lasts for the session; solved secrets and picked-up seeds are saved.
const HUM_EVERY = 11, HUM_STEP = 0.85, HUM_RANGE = 34, GLOW_DECAY = 1.4
/** First visit to each side area: a caption that hints at its secret. */
const arrival: Record<SecretId, string> = {
  glen: '瀑布在低声哼唱。听一听，再去碰那几块石头。',
  hollow: '巨大的蘑菇都睡着了。走到它们的伞盖下，唤醒它们。',
  lake: '湖面下藏着一串踏石。从岸边起，一块接一块地走过去。',
  overlook: '在崖边站一会儿，看看你走过的森林。',
}
const solved: Record<SecretId, string> = {
  glen: '回声对上了。瀑布脚下亮起了一颗种子。',
  hollow: '孢子升起来了。幽谷中央落下一颗种子。',
  lake: '踏石连成了光路，湖心的石龛醒了。',
  overlook: '整片森林都在你脚下。崖边留着一颗种子。',
}
const areas: [SecretId, typeof GLEN][] = [['glen', GLEN], ['hollow', HOLLOW], ['lake', LAKE], ['overlook', OVERLOOK]]
const NOTES = [3, 5, 7] // echo stones' pentatonic steps

export function SecretsDirector({ player }: { player: Vector3 }) {
  const state = useMemo(() => ({ ...createSecretState(), armedStones: echoStones.map(() => true), armedFord: fordStones.map(() => true), echoAt: echoStones.map(() => -Infinity),
    nextHum: 0, vistaFor: 0, seedsShown: -1 }), [])
  useFrame((_, delta) => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return
    const dt = Math.min(delta, 0.1), now = routeClock.now, ease = 1 - Math.exp(-dt / 0.35)
    const say = (id: string, text: string) => { if (route.captions.has(id)) return; route.captions.add(id); saveRequest.dirty = true; store.showCaption(text) }
    const win = (id: SecretId, x: number, z: number) => {
      if (!solve(route, id, now)) return
      saveRequest.dirty = true; store.showCaption(solved[id])
      const y = heightAt(x, z) + 1.5
      ;[0, 2, 4, 5, 7, 9].forEach((n, k) => soundscape.chime(n, x, y, z, 0.2 + k * 0.16))
    }
    for (const [id, rect] of areas) if (rectDistance(player.x, player.z, rect) === 0) say(`side-${id}`, arrival[id])

    // Echo stones by the waterfall.
    const glenDone = route.secretsAt.has('glen')
    if (!glenDone && Math.hypot(player.x - PLUNGE_POOL.x, player.z - PLUNGE_POOL.z) < HUM_RANGE && now >= state.nextHum) {
      state.nextHum = now + HUM_EVERY
      ECHO_ORDER.forEach((stone, k) => { const s = echoStones[stone]; soundscape.chime(NOTES[stone], s.x, heightAt(s.x, s.z) + 1.4, s.z, 0.4 + k * HUM_STEP); state.echoAt[stone] = now + 0.4 + k * HUM_STEP })
    }
    echoStones.forEach((s, i) => {
      const d = Math.hypot(player.x - s.x, player.z - s.z)
      if (d > STONE_REACH + 1.2) state.armedStones[i] = true
      if (!glenDone && d < STONE_REACH && state.armedStones[i]) {
        state.armedStones[i] = false; state.echoAt[i] = now
        soundscape.chime(NOTES[i], s.x, heightAt(s.x, s.z) + 1.4, s.z)
        if (touchEcho(state, i) === 'solved') win('glen', seeds[0].x, seeds[0].z)
      }
      const since = now - state.echoAt[i]
      secretFx.echo[i] = since >= 0 && since < GLOW_DECAY ? 1 - since / GLOW_DECAY : glenDone ? 0.35 : 0
    })
    const glenAt = route.secretsAt.get('glen')
    secretFx.waterfallGlow = glenAt === undefined ? 0 : Math.max(0, 1 - Math.abs(now - glenAt - 2) / 4)

    // Giant mushrooms in the hollow.
    const hollowDone = route.secretsAt.has('hollow')
    giantMushrooms.forEach((m, i) => {
      if (!hollowDone && Math.hypot(player.x - m.x, player.z - m.z) < m.radius + MUSHROOM_REACH) {
        const r = wakeMushroom(state, i)
        if (r !== 'none') soundscape.chime(2 + (i % 5), m.x, heightAt(m.x, m.z) + 3, m.z)
        if (r === 'solved') win('hollow', HOLLOW_HEART[0], HOLLOW_HEART[1])
      }
      const target = hollowDone || state.mushrooms.has(i) ? 1 : 0
      secretFx.mushrooms[i] += (target - secretFx.mushrooms[i]) * ease * 0.5
    })
    secretFx.spores += ((hollowDone ? 1 : 0) - secretFx.spores) * ease * 0.3

    // The lake's ford to the island shrine.
    const lakeDone = route.secretsAt.has('lake')
    fordStones.forEach((f, i) => {
      const d = Math.hypot(player.x - f.x, player.z - f.z)
      if (d > FORD_REACH + 0.8) state.armedFord[i] = true
      if (!lakeDone && d < FORD_REACH && state.armedFord[i]) {
        state.armedFord[i] = false
        const r = stepFord(state, i)
        if (r === 'progress' || r === 'solved') soundscape.chime(i, f.x, 0.6, f.z)
        if (r === 'reset') soundscape.chime(0, f.x, 0.6, f.z)
        if (r === 'solved') win('lake', SHRINE[0], SHRINE[1])
      }
      secretFx.ford[i] += (((lakeDone || i < state.ford) ? 1 : 0) - secretFx.ford[i]) * ease
    })
    secretFx.shrine += ((lakeDone ? 1 : 0) - secretFx.shrine) * ease * 0.4

    // The overlook's vista: stand at the edge; the camera draws back over the valley.
    if (!route.secretsAt.has('overlook') && Math.hypot(player.x - VISTA_POINT[0], player.z - VISTA_POINT[1]) < VISTA_REACH) {
      if ((state.vistaFor += dt) >= VISTA_HOLD) {
        win('overlook', VISTA_POINT[0], VISTA_POINT[1])
        Object.assign(cameraMoment, { at: now, hold: 9, pull: 8, lift: 6 })
        cameraMoment.aim.set(VISTA_POINT[0] + 60, heightAt(VISTA_POINT[0], VISTA_POINT[1]) - 6, VISTA_POINT[1])
      }
    } else state.vistaFor = 0

    // Light seeds.
    seeds.forEach((s, i) => {
      if (!seedAvailable(route, i) || Math.hypot(player.x - s.x, player.z - s.z) > SEED_REACH) return
      const line = collectSeed(route, i, now)
      if (!line) return
      saveRequest.dirty = true; store.showCaption(line)
      const y = heightAt(s.x, s.z) + 1
      ;[4, 7, 9].forEach((n, k) => soundscape.chime(n, s.x, y, s.z, k * 0.09))
    })
    if (route.seedsAt.size !== state.seedsShown) { state.seedsShown = route.seedsAt.size; store.setSeeds({ found: route.seedsAt.size, total: seeds.length }) }
  })
  return null
}
