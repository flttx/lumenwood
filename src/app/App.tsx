import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { World } from '../game/world/World'
import { useGameStore } from '../state/gameStore'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { Overlay } from '../ui/Overlay'
import { qualitySettings } from '../game/rendering/config'
import { requestLock } from '../game/input/focus'
import { soundscape } from '../game/audio/engine'

/** Drives a steady 30 FPS render cadence when office-laptop power-saver mode is enabled. */
function FramePacer({ enabled }: { enabled: boolean }) {
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => {
    if (!enabled) return
    invalidate()
    const id = window.setInterval(() => invalidate(), 33)
    return () => window.clearInterval(id)
  }, [enabled, invalidate])
  return null
}

export function App() {
  const phase = useGameStore(s => s.phase)
  const quality = useGameStore(s => s.quality)
  const powerSave = useGameStore(s => s.powerSave)
  const pause = useGameStore(s => s.pause)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && !event.repeat) {
        const state = useGameStore.getState()
        if (state.contextLost) return
        if (state.journalOpen) {
          state.setJournalOpen(false)
          return
        }
        if (state.endingCard) {
          soundscape.start()
          state.setEndingCard(false)
          state.resume()
          requestLock(document.querySelector('.app canvas'))
          return
        }
        if (state.phase === 'playing') pause()
        // Esc that releases pointer lock already paused via pointerlockchange; ignore its keydown echo.
        else if (state.phase === 'paused' && performance.now() - state.pausedAt > 300) {
          soundscape.start()
          state.resume()
          requestLock(document.querySelector('.app canvas'))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pause])
  const preset = qualitySettings[quality] ?? qualitySettings.high
  return <ErrorBoundary><main className="app">
    {phase !== 'title' && <Suspense fallback={null}>
      <Canvas frameloop={powerSave ? 'demand' : 'always'} dpr={powerSave ? 1 : preset.dpr} shadows={preset.shadowMapSize > 0 ? 'soft' : false} camera={{ fov: 50, near: 0.25, far: 320 }}>
        <FramePacer enabled={powerSave}/>
        <World />
      </Canvas>
    </Suspense>}
    <Overlay />
  </main></ErrorBoundary>
}
