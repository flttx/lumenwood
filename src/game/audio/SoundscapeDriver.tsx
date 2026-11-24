import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../../state/gameStore'
import { atmosphere } from '../rendering/timeOfDay'
import { wind } from '../rendering/wind'
import { soundscape } from './engine'
/** Bridges low-frequency settings (volume, pause) and the frame loop (listener, ambience) to the soundscape. */
export function SoundscapeDriver() {
  useEffect(() => {
    let lastVolume = -1, lastActive: boolean | null = null
    const apply = (s: { volume: number; phase: string }) => {
      if (s.volume !== lastVolume) { lastVolume = s.volume; soundscape.setVolume(s.volume) }
      const active = s.phase === 'playing'
      if (active !== lastActive) { lastActive = active; soundscape.setActive(active) }
    }
    apply(useGameStore.getState())
    const unsubscribe = useGameStore.subscribe(apply)
    return () => { unsubscribe(); soundscape.setActive(false) } // back on the title screen the forest falls silent
  }, [])
  useFrame(({ camera }, delta) => soundscape.update(Math.min(delta, 0.1), atmosphere.blend, camera, atmosphere.wetland, atmosphere.highland, wind.gust, atmosphere.night))
  return null
}
