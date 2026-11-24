import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { World } from '../game/world/World'
import { useGameStore } from '../state/gameStore'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { Overlay } from '../ui/Overlay'
import { qualitySettings } from '../game/rendering/config'
import { requestLock } from '../game/input/focus'
import { soundscape } from '../game/audio/engine'
export function App() {
  const phase = useGameStore(s => s.phase)
  const quality = useGameStore(s => s.quality)
  const pause = useGameStore(s => s.pause)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && !event.repeat) {
        const state = useGameStore.getState()
        if (state.contextLost) return
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
      <Canvas dpr={preset.dpr} shadows={preset.shadowMapSize > 0 ? 'soft' : false} camera={{ fov: 50, near: 0.25, far: 320 }}><World /></Canvas>
    </Suspense>}
    <Overlay />
  </main></ErrorBoundary>
}
