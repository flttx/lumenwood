import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { World } from '../game/world/World'
import { useGameStore } from '../state/gameStore'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { Overlay } from '../ui/Overlay'
import { qualitySettings } from '../game/rendering/config'
export function App() {
  const phase = useGameStore(s => s.phase)
  const quality = useGameStore(s => s.quality)
  const pause = useGameStore(s => s.pause)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && !event.repeat) {
        const state = useGameStore.getState()
        if (state.phase === 'playing') pause()
        // Esc that releases pointer lock already paused via pointerlockchange; ignore its keydown echo.
        else if (state.phase === 'paused' && performance.now() - state.pausedAt > 300) state.resume()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pause])
  return <main className="app">
    {phase !== 'title' && <ErrorBoundary><Suspense fallback={<div className="loading">正在进入森林…</div>}>
      <Canvas dpr={qualitySettings[quality].dpr} shadows={qualitySettings[quality].shadowMapSize > 0 ? 'soft' : false} camera={{ fov: 50, near: 0.1, far: 320 }}><World /></Canvas>
    </Suspense></ErrorBoundary>}
    <Overlay />
  </main>
}
