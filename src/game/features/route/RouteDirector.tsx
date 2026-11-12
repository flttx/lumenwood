import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { soundscape } from '../../audio/engine'
import { musicLayers } from '../../audio/music'
import { GLADE, gates, rectDistance } from '../../world/regions'
import { GLADE_CENTRE } from '../../world/zones/wetlandLayout'
import { PLATEAU_HEIGHT } from '../../world/zones/highlandLayout'
import { sz } from '../../world/scale'
import { flock } from './flock'
import { ascentOpen, gateOpen, reachFinale, route, routeClock, tryLight } from './progress'
import { LANTERN_COST, LANTERN_RANGE, lanternPlacements, routeEnds, zoneLanterns } from './routeLayout'
import { HINT_AFTER, captions, hintTarget, zoneAt, type CaptionId } from './guide'
import type { RegionId } from '../../../state/gameStore'
import { serialize, writeSave } from './save'
// Applies the route rules each frame: advances play time and the flock, lights nodes the player reaches with enough
// fireflies, opens gates once a zone's stream has arrived, and plays the finale and ending. It also drives the guidance
// (first-time captions, a pulse on the next target after a stall), the score's voices and the local save. Rendering lives
// in the sibling components.
const REARM = LANTERN_RANGE + 1, CAPTION_START = 3, ENDING_CARD = 14, SAVE_EVERY = 5
/** Seconds the player must stay in a new region before its name banner shows (no flicker along a boundary). */
const REGION_SETTLE = 1.2
/** Where the stall hint currently points (read by HintPulse). Frame-loop state, not React state. */
export const hint = { x: 0, y: 0, z: 0, at: -Infinity }

export function RouteDirector({ player }: { player: Vector3 }) {
  // A node reacts once per approach; walking more than REARM metres away re-arms it.
  const armed = useMemo(() => lanternPlacements.map(() => true), [])
  const memory = useMemo(() => ({ released: route.released.size, lastProgress: routeClock.now, saveTimer: SAVE_EVERY, dirty: false, gates: '', region: '' as RegionId | '', candidate: '' as RegionId | '', candidateSince: 0, journey: '' }), [])
  useFrame((_, delta) => {
    if (useGameStore.getState().phase !== 'playing') return
    const dt = Math.min(delta, 0.1), now = (routeClock.now += dt)
    const say = (id: CaptionId) => {
      if (route.captions.has(id)) return
      route.captions.add(id); memory.dirty = true
      useGameStore.getState().showCaption(captions[id])
    }
    const progressed = () => { memory.lastProgress = now; memory.dirty = true }
    // A restored journey brings its following fireflies back around the player.
    for (let missing = route.carried - flock.following; missing > 0; missing--) flock.spawn(player.x, player.y + 1.2, player.z)
    flock.update(dt, player, now)
    // HUD: region banner on entering a new region, and the lantern / firefly tally when it changes.
    const region: RegionId = rectDistance(player.x, player.z, GLADE) === 0 ? 'glade' : zoneAt(player.z)
    if (region !== memory.candidate) { memory.candidate = region; memory.candidateSince = now }
    if (region !== memory.region && (now - memory.candidateSince >= REGION_SETTLE || !memory.region)) { memory.region = region; useGameStore.getState().showRegion(region) }
    const lit = route.litAt.filter(t => t !== null).length, tally = `${lit}/${route.carried}`
    if (tally !== memory.journey) { memory.journey = tally; useGameStore.getState().setJourney({ lit, total: lanternPlacements.length, carried: route.carried }) }
    if (route.released.size !== memory.released) {
      if (route.released.size > memory.released) { say('firstFirefly'); progressed() }
      memory.released = route.released.size
    }
    lanternPlacements.forEach((lantern, i) => {
      const distance = Math.hypot(player.x - lantern.x, player.z - lantern.z)
      if (distance > REARM) armed[i] = true
      if (!armed[i]) return
      const result = tryLight(route, i, distance, now)
      if (result === 'none') return
      armed[i] = false
      if (result === 'short') { say('short'); return }
      progressed(); say('firstLit')
      flock.send(LANTERN_COST, lantern.light)
      const [x, y, z] = lantern.light
      // A major triad as the fireflies arrive; the zone's completion adds a rising arpeggio from the gate's direction.
      ;[0, 2, 4].forEach((note, n) => soundscape.chime(note, x, y, z, 0.8 + n * 0.12))
      if (route.completedAt[lantern.zone] === now) {
        const [gx, gz] = routeEnds[lantern.zone]
        ;[0, 1, 2, 3, 4, 5, 7].forEach((note, n) => soundscape.chime(note, gx, 1.5 + (lantern.zone === 'highland' ? PLATEAU_HEIGHT : 0), gz, 1.8 + n * 0.22))
      }
      if (lantern.zone === 'highland') {
        const litHere = zoneLanterns('highland').filter(j => route.litAt[j] !== null).length
        if (litHere === 1) say('cradle1')
        if (litHere === 2) say('cradle2')
      }
    })
    gates.north = gateOpen(route, 'camp', now)
    gates.bridge = gateOpen(route, 'wetland', now)
    gates.ascent = ascentOpen(route, now)
    const gateState = `${+gates.north}${+gates.bridge}${+gates.ascent}`
    if (gateState !== memory.gates) {
      if (memory.gates) progressed()
      memory.gates = gateState
    }
    // Finale: two rising octaves of the pentatonic from the glade centre as the firefly column lifts.
    if (reachFinale(route, rectDistance(player.x, player.z, GLADE) === 0, now)) {
      progressed(); say('glade')
      for (let n = 0; n < 10; n++) soundscape.chime(n, GLADE_CENTRE[0], 2, GLADE_CENTRE[1], 0.3 + n * 0.28)
      ;[0, 2, 4].forEach((note, n) => soundscape.chime(note, GLADE_CENTRE[0], 3, GLADE_CENTRE[1], 3.4 + n * 0.04))
    }
    // First-time captions for places and gates.
    if (now > CAPTION_START && route.released.size === 0) say('start')
    if (gates.north && player.z > sz(18)) say('campDone')
    if (player.z > sz(38) && player.z < sz(62)) say('wetland')
    if (gates.bridge) say('bridge')
    if (player.z > sz(100)) say('highland')
    // Ending: once the crown has gathered its light, the ending card (the game continues afterwards).
    const done = route.completedAt.highland
    if (done !== null && !route.endingSeen && now - done > ENDING_CARD) {
      route.endingSeen = true; memory.dirty = true
      document.exitPointerLock?.()
      useGameStore.getState().setEndingCard(true)
    }
    // Stall hint: after HINT_AFTER seconds without progress, pulse the next target and chime from its direction.
    if (now - memory.lastProgress > HINT_AFTER) {
      memory.lastProgress = now
      const target = hintTarget(route, player.x, player.z)
      if (target) {
        const lifted = target.z > sz(99) ? PLATEAU_HEIGHT : 0
        Object.assign(hint, { x: target.x, y: lifted, z: target.z, at: now })
        soundscape.chime(4, target.x, lifted + 1.5, target.z)
      }
    }
    // Score: voices follow progress.
    soundscape.setMusicLayers(musicLayers({
      lit: route.litAt.filter(t => t !== null).length, campDone: route.completedAt.camp !== null, wetlandDone: route.completedAt.wetland !== null,
      highlandLit: zoneLanterns('highland').filter(j => route.litAt[j] !== null).length, ending: done !== null,
    }))
    // Save on progress, and the position every few seconds.
    if (memory.dirty || (memory.saveTimer -= dt) <= 0) {
      writeSave(serialize(route, [player.x, player.z]))
      memory.dirty = false; memory.saveTimer = SAVE_EVERY
    }
  })
  return null
}
