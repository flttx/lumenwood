import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../../state/gameStore'
import { atmosphere } from '../rendering/timeOfDay'
import { soundscape } from './engine'
/** Bridges low-frequency settings (volume, pause) and the frame loop (listener, ambience) to the soundscape. */
export function SoundscapeDriver() {
  useEffect(() => {
    const apply = ({ volume, phase }: { volume: number; phase: string }) => { soundscape.setVolume(volume); soundscape.setActive(phase === 'playing') }
    apply(useGameStore.getState())
    const unsubscribe = useGameStore.subscribe(apply)
    return () => { unsubscribe(); soundscape.setActive(false) } // back on the title screen the forest falls silent
  }, [])
  useFrame(({ camera }, delta) => soundscape.update(Math.min(delta, 0.1), atmosphere.blend, camera, atmosphere.wetland))
  return null
}
