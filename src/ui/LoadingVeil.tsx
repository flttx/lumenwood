import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useGameStore } from '../state/gameStore'
import { Motes } from './decor'
const TIPS = ['靠近发光的花，它会回应你', '萤火会跟着你，带它们去点亮灯笼', '浅水可以涉过，深水要绕开', '迷路时停一停，森林会给你指引']

/**
 * Covers the screen from the moment the journey starts until the world has mounted and warmed its shaders, then fades.
 * Shows real download progress (three's loading manager), then a short "lighting up" phase while shaders compile.
 * Once faded out, unmounts its animated keyart and CSS motes while keeping the empty `.loading-veil.done` sentinel.
 */
export function LoadingVeil() {
  const ready = useGameStore(s => s.worldReady)
  const { progress, active } = useProgress()
  const loading = active || progress < 100
  const done = ready && !active
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!done) { setSettled(false); return }
    const id = window.setTimeout(() => setSettled(true), 1800)
    return () => window.clearTimeout(id)
  }, [done])
  return <div
    className={done ? 'screen loading-veil done' : 'screen loading-veil'}
    aria-hidden={done}
    role={done ? undefined : 'progressbar'}
    aria-valuemin={done ? undefined : 0}
    aria-valuemax={done ? undefined : 100}
    aria-valuenow={done ? undefined : Math.round(progress)}
    aria-label="载入森林"
    onTransitionEnd={e => { if (done && e.target === e.currentTarget) setSettled(true) }}
  >
    {!settled && <>
      <div className="keyart dim"/><Motes count={18} seed={21}/>
      <div className="loading-centre">
        <div className="logo small">流光之森</div>
        <div className="bar"><i style={{ transform: `scaleX(${loading ? progress / 100 : 1})` }}/></div>
        <div className="loading-state">{loading ? `正在进入森林 · ${Math.round(progress)}%` : '点亮森林…'}</div>
        <div className="tips">{TIPS.map(t => <span key={t}>{t}</span>)}</div>
      </div>
    </>}
  </div>
}
