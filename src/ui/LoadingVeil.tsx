import { useProgress } from '@react-three/drei'
import { useGameStore } from '../state/gameStore'
import { Motes } from './decor'
const TIPS = ['靠近发光的花，它会回应你', '萤火会跟着你，带它们去点亮灯笼', '浅水可以涉过，深水要绕开', '迷路时停一停，森林会给你指引']

/**
 * Covers the screen from the moment the journey starts until the world has mounted and warmed its shaders, then fades.
 * Shows real download progress (three's loading manager), then a short "lighting up" phase while shaders compile.
 */
export function LoadingVeil() {
  const ready = useGameStore(s => s.worldReady)
  const { progress, active } = useProgress()
  const loading = active || progress < 100
  return <div className={ready ? 'screen loading-veil done' : 'screen loading-veil'} aria-hidden={ready} role={ready ? undefined : 'progressbar'} aria-valuenow={Math.round(progress)} aria-label="载入森林">
    <div className="keyart dim"/><Motes count={18} seed={21}/>
    <div className="loading-centre">
      <div className="logo small">流光之森</div>
      <div className="bar"><i style={{ transform: `scaleX(${loading ? progress / 100 : 1})` }}/></div>
      <div className="loading-state">{loading ? `正在进入森林 · ${Math.round(progress)}%` : '点亮森林…'}</div>
      <div className="tips">{TIPS.map(t => <span key={t}>{t}</span>)}</div>
    </div>
  </div>
}
