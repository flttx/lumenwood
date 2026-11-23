import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { heightAt } from '../../world/terrain/terrain'
import { hint } from './RouteDirector'
import { directionLabel, navigationFocus, routeObjective, targetBearing, type NavigationHud } from './navigation'
import { route, routeClock } from './progress'
import { sunlightObjective } from '../sunlight/objective'
import { atmosphere } from '../../rendering/timeOfDay'
import { sideAreaAt, sideObjective } from '../secrets/objective'
import { secretSession } from '../secrets/session'
import { conduit } from './conduit'
import { ANCIENT_TREE } from '../../world/zones/highlandLayout'

/** Persistent instructions update at most four times a second; only changed, quantised values enter React state. */
export function RouteGuidance({ player }: { player: Vector3 }) {
  const memory = useMemo(() => ({ timer: 0, id: '', signature: '', forward: new Vector3(), pulseAt: -Infinity, pulseId: '', main: false, area: '' }), [])
  useEffect(() => {
    const toggle = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT' || e.repeat || useGameStore.getState().phase !== 'playing' || !sideAreaAt(player.x, player.z)) return
      e.preventDefault(); memory.area = sideAreaAt(player.x, player.z) ?? ''; memory.main = !memory.main; memory.timer = 0
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [player, memory])
  useFrame(({ camera }, delta) => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return
    memory.timer -= delta
    if (memory.timer > 0) return
    memory.timer = 0.25
    const local = sideObjective(route, player.x, player.z, secretSession.state), area = sideAreaAt(player.x, player.z) ?? ''
    if (area !== memory.area) { memory.main = false; memory.area = area }
    const objective = (!memory.main ? local : null) ?? sunlightObjective(route, player.x, player.z, atmosphere.time) ?? routeObjective(route, player.x, player.z, routeClock.now, memory.id)
    if (local && memory.main) objective.alternateHint = '按 T 查看此地的线索'
    if (!local && objective.id.startsWith('lantern-') && conduit.near >= 0 && route.carried >= 2) {
      if (conduit.near !== conduit.expected) objective.detail = '这座光脉尚未接通，先前往当前指引的灯座。'
      else {
        objective.id = `conduit-${conduit.expected}`
        objective.title = conduit.aligned ? '按住 E，将萤火沿光脉送入古树' : '留在灯座旁，转向古树'
        objective.detail = '面向古树并按住 E；松开或转开镜头，光脉会回落。'
        objective.progress += ` · 光脉 ${Math.floor(conduit.charge * 100)}%`
        objective.target = { x: ANCIENT_TREE[0], z: ANCIENT_TREE[1] }
        objective.actionHint = '留在灯座旁按住 E'
      }
    }
    navigationFocus.target = objective.target
    if (store.worldReady && objective.id !== memory.pulseId && objective.target && routeClock.now - memory.pulseAt > 3) {
      const { x, z } = objective.target
      Object.assign(hint, { x, z, y: heightAt(x, z), at: routeClock.now })
      memory.pulseAt = routeClock.now
      memory.pulseId = objective.id
    }
    memory.id = objective.id
    camera.getWorldDirection(memory.forward)
    const t = objective.target, dx = t ? t.x - player.x : 0, dz = t ? t.z - player.z : 0
    const angle = t ? targetBearing(dx, dz, memory.forward.x, memory.forward.z) : 0
    const hud: NavigationHud = { id: objective.id, title: objective.title, detail: objective.detail, progress: objective.progress, actionHint: objective.actionHint, alternateHint: objective.alternateHint,
      distance: t ? Math.ceil(Math.hypot(dx, dz)) : null, angle, direction: t ? directionLabel(angle) : '' }
    const signature = JSON.stringify(hud)
    if (signature !== memory.signature) { memory.signature = signature; store.setObjective(hud) }
  })
  return null
}
