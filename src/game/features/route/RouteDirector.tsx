import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { soundscape } from '../../audio/engine'
import { gates } from '../../world/regions'
import { flock } from './flock'
import { gateOpen, route, routeClock, tryLight } from './progress'
import { LANTERN_COST, LANTERN_RANGE, lanternPlacements, routeEnds } from './routeLayout'
// Applies the route rules each frame: advances play time and the flock, lights lanterns the player reaches with enough
// fireflies, and opens gates once a zone's stream has arrived. Rendering lives in the sibling components.
const REARM = LANTERN_RANGE + 1
export function RouteDirector({ player }: { player: Vector3 }) {
  // A lantern reacts once per approach; walking more than REARM metres away re-arms it.
  const armed = useMemo(() => lanternPlacements.map(() => true), [])
  useFrame((_, delta) => {
    if (useGameStore.getState().phase !== 'playing') return
    const dt = Math.min(delta, 0.1), now = (routeClock.now += dt)
    flock.update(dt, player, now)
    lanternPlacements.forEach((lantern, i) => {
      const distance = Math.hypot(player.x - lantern.x, player.z - lantern.z)
      if (distance > REARM) armed[i] = true
      if (!armed[i]) return
      const result = tryLight(route, i, distance, now)
      if (result === 'none') return
      armed[i] = false
      if (result !== 'lit') return
      flock.send(LANTERN_COST, lantern.light)
      const [x, y, z] = lantern.light
      // A major triad as the fireflies arrive; the zone's completion adds a rising arpeggio from the gate's direction.
      ;[0, 2, 4].forEach((note, n) => soundscape.chime(note, x, y, z, 0.8 + n * 0.12))
      if (route.completedAt[lantern.zone] === now) {
        const [gx, gz] = routeEnds[lantern.zone]
        ;[0, 1, 2, 3, 4, 5, 7].forEach((note, n) => soundscape.chime(note, gx, 1.5, gz, 1.8 + n * 0.22))
      }
    })
    gates.north = gateOpen(route, 'camp', now)
  })
  return null
}
