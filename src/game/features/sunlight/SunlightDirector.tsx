import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { atmosphere } from '../../rendering/timeOfDay'
import { markActivity, route, routeClock } from '../route/progress'
import { saveRequest } from '../route/save'
import { soundscape } from '../../audio/engine'
import { SUN_MIRRORS, SUN_PLANT, SUN_REACH, SUN_REWARD_INDEX, inSunRect, SUN_CLEARING } from './layout'
import { advanceSunlight, hasDaylight, rotateSunMirror, traceSunlight } from './progress'
import { onSunIsland } from './objective'
import { sunIslandDistance } from './landform'

const nearestMirror = (player: Vector3) => SUN_MIRRORS.findIndex(m => Math.hypot(player.x - m.x, player.z - m.z) <= SUN_REACH)
export function SunlightDirector({ player }: { player: Vector3 }) {
  const memory = useMemo(() => ({ timer: 0, signature: '', introduced: false, vineTimer: 0 }), [])
  useEffect(() => {
    const turn = (e: KeyboardEvent) => {
      if (e.repeat || (e.code !== 'KeyE' && e.code !== 'KeyQ') || useGameStore.getState().phase !== 'playing' || !hasDaylight(atmosphere.time)) return
      const index = nearestMirror(player)
      if (index < 0) return
      e.preventDefault()
      rotateSunMirror(route.sunlight, index, e.code === 'KeyE' ? 1 : -1)
      markActivity(); saveRequest.dirty = true; memory.timer = 0
      const m = SUN_MIRRORS[index]
      const trace = traceSunlight(route.sunlight.steps, true)
      if (trace.receiver) soundscape.cue('lock', SUN_PLANT.x, 1.4, SUN_PLANT.z, 1.25)
      else if (index === 0 && trace.relay) soundscape.cue('lock', SUN_MIRRORS[1].x, 1.4, SUN_MIRRORS[1].z, 1)
      else if (trace.loop || trace.segments[index]?.hit === 'rock') soundscape.cue('reject', m.x, 1.4, m.z)
      else soundscape.chime(1 + route.sunlight.steps[index] % 5, m.x, 1.4, m.z)
    }
    window.addEventListener('keydown', turn)
    return () => { window.removeEventListener('keydown', turn); useGameStore.getState().setSunlight(null) }
  }, [player, memory])
  useFrame((_, dt) => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return
    const s = route.sunlight, day = hasDaylight(atmosphere.time), before = s.grownAt, prevGrowth = s.growth
    const path = advanceSunlight(s, dt, day, routeClock.now)
    if (s.growth > prevGrowth && s.growth < 0.995) {
      if ((memory.vineTimer -= Math.min(dt, 0.1)) <= 0) {
        memory.vineTimer = 0.26
        soundscape.event('vineGrow', SUN_PLANT.x, 0.8, SUN_PLANT.z, s.growth)
      }
    } else memory.vineTimer = 0
    if (before === null && s.grownAt !== null) {
      markActivity(); saveRequest.dirty = true
      store.showCaption('阳光让沉睡的藤蔓长成了一座桥。试着走到对岸。')
      ;[0, 2, 4, 7].forEach((n, i) => soundscape.chime(n, SUN_PLANT.x, 1, SUN_PLANT.z, i * 0.18))
    }
    // Accept both legacy rect and curved island distance so collecting seed #8 from the north edge always completes the crossing.
    const onIsland = onSunIsland(player.x, player.z) || sunIslandDistance(player.x, player.z) < 0.8
    if (!s.crossed && s.grownAt !== null && onIsland && route.seedsAt.has(SUN_REWARD_INDEX)) {
      s.crossed = true; markActivity(); saveRequest.dirty = true
      store.showCaption('你为森林长出了一条新路。带上种子，沿藤桥回到营地吧。')
    }
    if (!memory.introduced && routeClock.now > 3 && !s.crossed && !route.litAt.some(t => t !== null) && day) {
      memory.introduced = true
      if (!route.captions.has('sunStart')) {
        route.captions.add('sunStart'); saveRequest.dirty = true
        store.showCaption('空地上的日光镜，似乎能把阳光送到对岸。靠近后按 E 或 Q 转动。')
      }
    }
    if ((memory.timer -= dt) > 0) return
    memory.timer = 0.25
    const index = nearestMirror(player)
    const status = s.grownAt !== null ? '藤桥已长成，暮色也不会让它消失' : !day ? '日光镜需要阳光 · 暂停可改为白天' : path.receiver ? '嫩芽正在吸收阳光' : path.loop ? '光返回了来处 · 试着改变方向' : path.relay ? '第二座镜已收到阳光 · 观察它的落点' : path.segments[0]?.hit === 'rock' ? '光被岩石挡住了 · 试着转动镜面' : '观察光束的落点，把光送向另一座镜'
    const hud = inSunRect(player.x, player.z, SUN_CLEARING, 2) ? { index, heading: index >= 0 ? s.steps[index] * 45 : 0, growth: Math.floor(s.growth * 100), status, daylight: day, grown: s.grownAt !== null } : null
    const signature = JSON.stringify(hud)
    if (signature !== memory.signature) { memory.signature = signature; store.setSunlight(hud) }
  })
  return null
}
