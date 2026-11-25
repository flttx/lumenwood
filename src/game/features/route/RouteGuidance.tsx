import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { soundscape } from '../../audio/engine'
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
  const memory = useMemo(() => ({ timer: 0, id: '', routeId: '', signature: '', forward: new Vector3(), pulseAt: -Infinity, pulseId: '', manualPulseAt: -Infinity, main: false, area: '' }), [])
  useEffect(() => {
    const toggle = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const s = useGameStore.getState()
      if (s.phase !== 'playing' || s.journalOpen || s.endingCard) return
      const side = sideAreaAt(player.x, player.z)
      if (side) {
        e.preventDefault(); memory.area = side; memory.main = !memory.main; memory.timer = 0
        return
      }
      // Outside side areas, pressing T fires an on-demand guidance light pillar & chime toward the current objective.
      const target = navigationFocus.target
      if (target && routeClock.now - memory.manualPulseAt > 1.5) {
        e.preventDefault()
        const lifted = heightAt(target.x, target.z)
        Object.assign(hint, { x: target.x, y: lifted, z: target.z, at: routeClock.now })
        soundscape.chime(4, target.x, lifted + 1.5, target.z)
        memory.manualPulseAt = routeClock.now
      }
    }
    window.addEventListener('keydown', toggle)
    return () => window.removeEventListener('keydown', toggle)
  }, [player, memory])
  useFrame(({ camera }, delta) => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return
    memory.timer -= delta
    if (memory.timer > 0) return
    memory.timer = conduit.charge > 0 && conduit.charge < 1 ? 0.1 : 0.25
    const local = sideObjective(route, player.x, player.z, secretSession.state, routeClock.now), area = sideAreaAt(player.x, player.z) ?? ''
    if (area !== memory.area) { memory.main = false; memory.area = area }
    const objective = (!memory.main ? local : null) ?? sunlightObjective(route, player.x, player.z, atmosphere.time) ?? routeObjective(route, player.x, player.z, routeClock.now, memory.routeId)
    if (!objective.id.startsWith('conduit-')) memory.routeId = objective.id
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
    if (store.worldReady && objective.id !== memory.pulseId && !objective.id.startsWith('conduit-') && objective.target && routeClock.now - memory.pulseAt > 3) {
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
