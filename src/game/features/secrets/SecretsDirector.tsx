import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { soundscape } from '../../audio/engine'
import { cameraMoment } from '../../camera/FollowCamera'
import { heightAt } from '../../world/terrain/terrain'
import { GLEN, HOLLOW, LAKE, OVERLOOK, REEF, STAR_CLIFF, VALE, rectDistance } from '../../world/regions'
import { HOLLOW_HEART, REEF_HEART, SHRINE, STAR_SHRINE, VALE_HEART, VISTA_POINT, echoStones, ECHO_ORDER, fordStones, giantMushrooms, reefCairns, seeds, valeStones } from '../../world/zones/sideLayout'
import { PLUNGE_POOL } from '../../world/zones/wetlandLayout'
import { markActivity, route, routeClock, type SecretId } from '../route/progress'
import { boostFlow, pulseRadiusAt, resonance } from '../resonance/resonance'
import { saveRequest } from '../route/save'
import { FORD_REACH, MUSHROOM_REACH, REEF_CAIRN_REACH, REEF_PULSE_REACH, SEED_REACH, STONE_REACH, VALE_HOLD, VALE_PULSE_REACH, VALE_STONE_REACH, VISTA_HOLD, VISTA_REACH, activateValeStone, activeValeCount, collectSeed, createSecretState, lightReefCairn, seedAvailable, solve, stepFord, touchEcho, wakeMushroom } from './secrets'
import { secretFx } from './fx'
import { secretSession } from './session'
// Applies the side areas' rules each frame (secrets.ts) and drives their look (fx.ts), sounds, captions and camera
// moments. Puzzle progress inside an area lasts for the session; solved secrets and picked-up seeds are saved.
const HUM_EVERY = 11, HUM_STEP = 0.85, HUM_RANGE = 26, GLOW_DECAY = 1.4, ECHO_CHIME_REF = 14, STAR_REACH = 3.4
const STAR_PROMPT = '北崖星台 · 按 E 远望海面与古树'
/** First visit to each side area: a caption that hints at its secret. */
const arrival: Record<SecretId, string> = {
  glen: '瀑布在低声哼唱。听一听，再去碰那几块石头。',
  hollow: '巨大的蘑菇都睡着了。走到它们的伞盖下，唤醒它们。',
  lake: '湖面下藏着一串踏石。从岸边起，一块接一块地走过去。',
  overlook: '在崖边站一会儿，看看你走过的森林。',
  vale: '林谷中央围着几座阳石柱。靠近它们，或按 F 唤光，让石柱一起亮起。',
  reef: '南湾石台上留着三座海石。靠近它们，或按 F 唤光，把海风里的光点亮。',
}
const solved: Record<SecretId, string> = {
  glen: '回声对上了。瀑布脚下亮起了一颗种子。',
  hollow: '孢子升起来了。幽谷中央落下一颗种子。',
  lake: '踏石连成了光路，湖心的石龛醒了。',
  overlook: '整片森林都在你脚下。崖边留着一颗种子。',
  vale: '阳石柱一起亮起来了。林谷中央落下一颗种子。',
  reef: '三座海石连成了灯火，望海石台亮起了一颗种子。',
}
const areas: [SecretId, typeof GLEN][] = [['glen', GLEN], ['hollow', HOLLOW], ['lake', LAKE], ['overlook', OVERLOOK], ['vale', VALE], ['reef', REEF]]
const NOTES = [3, 5, 7] // echo stones' pentatonic steps

export function SecretsDirector({ player }: { player: Vector3 }) {
  const state = useMemo(() => ({
    ...createSecretState(),
    armedStones: echoStones.map(() => true),
    armedFord: fordStones.map(() => true),
    armedVale: valeStones.map(() => true),
    armedReef: reefCairns.map(() => true),
    pulseStamp: -Infinity,
    valeWaveHit: valeStones.map(() => false),
    reefWaveHit: reefCairns.map(() => false),
    echoAt: echoStones.map(() => -Infinity),
    nextHum: 0, lastEchoTouch: -Infinity, vistaFor: 0, vistaStep: 0, seedsShown: -1, starNear: false,
  }), [])
  useEffect(() => { secretSession.state = state }, [state])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const store = useGameStore.getState()
      if (store.phase !== 'playing' || store.endingCard || store.contextLost || !state.starNear) return
      markActivity()
      secretFx.starFlare = 1
      const y = heightAt(STAR_SHRINE[0], STAR_SHRINE[1])
      ;[0, 2, 4, 7].forEach((n, k) => soundscape.chime(n, STAR_SHRINE[0], y + 1.8, STAR_SHRINE[1], k * 0.14))
      Object.assign(cameraMoment, { at: routeClock.now, hold: 6.5, pull: 8, lift: 5 })
      cameraMoment.aim.set(-10, 18, 430)
      store.showCaption('风从海面吹向古树，每一处已唤醒的微光都在天空里回应你。')
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (state.starNear) {
        state.starNear = false
        const store = useGameStore.getState()
        if (store.prompt === STAR_PROMPT) store.setPrompt(null)
      }
    }
  }, [state])
  useFrame((_, delta) => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return
    const dt = Math.min(delta, 0.1), now = routeClock.now, ease = 1 - Math.exp(-dt / 0.35)
    const say = (id: string, text: string) => { if (route.captions.has(id)) return; route.captions.add(id); saveRequest.dirty = true; store.showCaption(text) }
    const win = (id: SecretId, x: number, z: number) => {
      if (!solve(route, id, now)) return
      markActivity(); boostFlow(resonance, now, route.seedsAt.size, 2); saveRequest.dirty = true; store.showCaption(solved[id])
      soundscape.setSecretBonus(route.secretsAt.size)
      const y = heightAt(x, z) + 1.5
      ;[0, 2, 4, 5, 7, 9].forEach((n, k) => soundscape.chime(n, x, y, z, 0.2 + k * 0.16))
    }
    for (const [id, rect] of areas) if (rectDistance(player.x, player.z, rect) === 0) say(`side-${id}`, arrival[id])
    if (rectDistance(player.x, player.z, STAR_CLIFF) === 0) say('side-starcliff', '古树北侧藏着一座星台。站在这里，能看到整片海面与夜空。')

    // Echo stones by the waterfall: replay the sequence when near and not mid-attempt (or paused 9s to listen again).
    const glenDone = route.secretsAt.has('glen')
    if (!glenDone && Math.hypot(player.x - PLUNGE_POOL.x, player.z - PLUNGE_POOL.z) < HUM_RANGE && now >= state.nextHum && (state.echo.length === 0 || now - state.lastEchoTouch > 9)) {
      state.nextHum = now + HUM_EVERY
      ECHO_ORDER.forEach((stone, k) => {
        const s = echoStones[stone]
        soundscape.chime(NOTES[stone], s.x, heightAt(s.x, s.z) + 1.4, s.z, 0.4 + k * HUM_STEP, ECHO_CHIME_REF)
        state.echoAt[stone] = now + 0.4 + k * HUM_STEP
      })
    }
    echoStones.forEach((s, i) => {
      const d = Math.hypot(player.x - s.x, player.z - s.z)
      if (d > STONE_REACH + 1.2) state.armedStones[i] = true
      if (!glenDone && d < STONE_REACH && state.armedStones[i]) {
        state.armedStones[i] = false; state.lastEchoTouch = now; markActivity()
        const y = heightAt(s.x, s.z) + 1.4
        const r = touchEcho(state, i)
        if (r === 'wrong') {
          soundscape.cue('reset', s.x, y, s.z)
          state.echoAt.fill(-Infinity)
          if (state.echo.includes(i)) state.echoAt[i] = now
          state.nextHum = Math.min(state.nextHum, now + 2.5)
        } else {
          state.echoAt[i] = now
          soundscape.chime(NOTES[i], s.x, y, s.z, 0, ECHO_CHIME_REF)
          if (r === 'solved') win('glen', seeds[0].x, seeds[0].z)
        }
      }
      const since = now - state.echoAt[i]
      const pulse = since >= 0 && since < GLOW_DECAY ? 1 - since / GLOW_DECAY : 0
      secretFx.echo[i] = Math.max(pulse, state.echo.includes(i) ? 0.65 : glenDone ? 0.35 : 0)
    })
    const glenAt = route.secretsAt.get('glen')
    secretFx.waterfallGlow = glenAt === undefined ? 0 : Math.max(0, 1 - Math.abs(now - glenAt - 2) / 4)

    // Giant mushrooms in the hollow: ascending notes as more mushrooms wake.
    const hollowDone = route.secretsAt.has('hollow')
    giantMushrooms.forEach((m, i) => {
      if (!hollowDone && Math.hypot(player.x - m.x, player.z - m.z) < m.radius + MUSHROOM_REACH) {
        const r = wakeMushroom(state, i)
        if (r !== 'none') {
          markActivity()
          soundscape.chime(1 + state.mushrooms.size, m.x, heightAt(m.x, m.z) + 3, m.z)
        }
        if (r === 'solved') win('hollow', HOLLOW_HEART[0], HOLLOW_HEART[1])
      }
      const target = hollowDone || state.mushrooms.has(i) ? 1 : 0
      secretFx.mushrooms[i] += (target - secretFx.mushrooms[i]) * ease * 0.5
    })
    secretFx.spores += ((hollowDone ? 1 : 0) - secretFx.spores) * ease * 0.3

    // The lake's ford to the island shrine: distinct reset cue and subtle glow on the next expected stone.
    const lakeDone = route.secretsAt.has('lake')
    fordStones.forEach((f, i) => {
      const d = Math.hypot(player.x - f.x, player.z - f.z)
      if (d > FORD_REACH + 0.8) state.armedFord[i] = true
      if (!lakeDone && d < FORD_REACH && state.armedFord[i]) {
        state.armedFord[i] = false
        const r = stepFord(state, i)
        if (r === 'progress' || r === 'solved') { markActivity(); soundscape.chime(i, f.x, 0.6, f.z) }
        if (r === 'reset') { markActivity(); soundscape.cue('reset', f.x, 0.6, f.z) }
        if (r === 'solved') win('lake', SHRINE[0], SHRINE[1])
      }
      secretFx.ford[i] += (((lakeDone || i < state.ford) ? 1 : 0) - secretFx.ford[i]) * ease
    })
    secretFx.nextFord = lakeDone ? -1 : state.ford
    secretFx.shrine += ((lakeDone ? 1 : 0) - secretFx.shrine) * ease * 0.4

    // Overlook vista: gentle audio build while holding still at the edge, then sweep over valley and coastline.
    if (!route.secretsAt.has('overlook') && Math.hypot(player.x - VISTA_POINT[0], player.z - VISTA_POINT[1]) < VISTA_REACH) {
      state.vistaFor += dt
      const y = heightAt(VISTA_POINT[0], VISTA_POINT[1])
      if (state.vistaFor >= 0.8 && state.vistaStep < 1) { state.vistaStep = 1; soundscape.chime(2, VISTA_POINT[0], y + 1.5, VISTA_POINT[1]) }
      if (state.vistaFor >= 1.6 && state.vistaStep < 2) { state.vistaStep = 2; soundscape.chime(4, VISTA_POINT[0], y + 1.5, VISTA_POINT[1]) }
      if (state.vistaFor >= VISTA_HOLD) {
        win('overlook', VISTA_POINT[0], VISTA_POINT[1])
        Object.assign(cameraMoment, { at: now, hold: 9, pull: 8, lift: 6 })
        cameraMoment.aim.set(VISTA_POINT[0] + 45, y - 7, VISTA_POINT[1] - 35)
      }
    } else { state.vistaFor = 0; state.vistaStep = 0 }

    // Sunstone Vale & Tidewater Reef: walk up to pillars/cairns or sweep them with the lantern resonance wave.
    if (resonance.pulseAt !== state.pulseStamp) {
      state.pulseStamp = resonance.pulseAt
      state.valeWaveHit.fill(false)
      state.reefWaveHit.fill(false)
    }
    const pulseR = pulseRadiusAt(resonance, now)
    const [ox, , oz] = resonance.pulseOrigin
    valeStones.forEach((s, i) => {
      const dp = Math.hypot(player.x - s.x, player.z - s.z)
      if (dp > VALE_STONE_REACH + 1.2) state.armedVale[i] = true
      const hitByWalk = dp < VALE_STONE_REACH && state.armedVale[i]
      const hitByPulse = pulseR > 0 && !state.valeWaveHit[i] && Math.hypot(ox - s.x, oz - s.z) <= Math.min(pulseR, VALE_PULSE_REACH)
      if (!route.secretsAt.has('vale') && (hitByWalk || hitByPulse)) {
        if (hitByWalk) state.armedVale[i] = false
        if (hitByPulse) state.valeWaveHit[i] = true
        const r = activateValeStone(state, i, now), sy = heightAt(s.x, s.z) + 1.8
        markActivity()
        if (r === 'solved') win('vale', VALE_HEART[0], VALE_HEART[1])
        else soundscape.chime(2 + activeValeCount(state, now), s.x, sy, s.z)
      }
      const valeDone = route.secretsAt.has('vale')
      const activeFrac = valeDone ? 1 : state.valeAt[i] > -Infinity ? Math.max(0, 1 - (now - state.valeAt[i]) / VALE_HOLD) : 0
      secretFx.vale[i] += (activeFrac - secretFx.vale[i]) * ease
    })
    secretFx.valeShrine += ((route.secretsAt.has('vale') ? 1 : 0) - secretFx.valeShrine) * ease * 0.45

    reefCairns.forEach((c, i) => {
      const dp = Math.hypot(player.x - c.x, player.z - c.z)
      if (dp > REEF_CAIRN_REACH + 1.0) state.armedReef[i] = true
      const hitByWalk = dp < REEF_CAIRN_REACH && state.armedReef[i]
      const hitByPulse = pulseR > 0 && !state.reefWaveHit[i] && Math.hypot(ox - c.x, oz - c.z) <= Math.min(pulseR, REEF_PULSE_REACH)
      if (!route.secretsAt.has('reef') && (hitByWalk || hitByPulse)) {
        if (hitByWalk) state.armedReef[i] = false
        if (hitByPulse) state.reefWaveHit[i] = true
        const r = lightReefCairn(state, i), cy = heightAt(c.x, c.z) + 1.6
        if (r === 'lit') {
          markActivity()
          soundscape.chime(2 + state.reef.size * 2, c.x, cy, c.z)
        } else if (r === 'solved') {
          win('reef', REEF_HEART[0], REEF_HEART[1])
          Object.assign(cameraMoment, { at: now, hold: 7.5, pull: 9, lift: 5 })
          cameraMoment.aim.set(0, 14, 40)
        }
      }
      const litTarget = route.secretsAt.has('reef') || state.reef.has(i) ? 1 : 0
      secretFx.reef[i] += (litTarget - secretFx.reef[i]) * ease
    })
    secretFx.reefBeacon += ((route.secretsAt.has('reef') ? 1 : 0) - secretFx.reefBeacon) * ease * 0.4

    // Starlight Terrace shrine prompt & pulse fade.
    const starNear = !store.endingCard && Math.hypot(player.x - STAR_SHRINE[0], player.z - STAR_SHRINE[1]) <= STAR_REACH
    if (starNear !== state.starNear) {
      state.starNear = starNear
      store.setPrompt(starNear ? STAR_PROMPT : store.prompt === STAR_PROMPT ? null : store.prompt)
    }
    secretFx.starFlare = Math.max(0, secretFx.starFlare - dt * 0.45)

    // Light seeds.
    seeds.forEach((s, i) => {
      if (!seedAvailable(route, i) || Math.hypot(player.x - s.x, player.z - s.z) > SEED_REACH) return
      const line = collectSeed(route, i, now)
      if (!line) return
      markActivity(); boostFlow(resonance, now, route.seedsAt.size, 2); saveRequest.dirty = true; store.showCaption(line)
      const y = heightAt(s.x, s.z) + 1
      ;[4, 7, 9].forEach((n, k) => soundscape.chime(n, s.x, y, s.z, k * 0.09))
    })
    soundscape.setSecretBonus(route.secretsAt.size)
    if (route.seedsAt.size !== state.seedsShown) { state.seedsShown = route.seedsAt.size; store.setSeeds({ found: route.seedsAt.size, total: seeds.length }) }
  })
  return null
}
