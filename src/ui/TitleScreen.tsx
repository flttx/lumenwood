import { useProgress } from '@react-three/drei'
import { soundscape } from '../game/audio/engine'
import { clearSave, readSave, restore, spawnPoint } from '../game/features/route/save'
import { resetProgress, route, routeClock } from '../game/features/route/progress'
import { flock } from '../game/features/route/flock'
import { useGameStore } from '../state/gameStore'
import { Leaf, Motes } from './decor'
import { Controls, Settings } from './Settings'

/** Title: key art of the twilight forest, the logo, and the way in. Models keep loading behind it. */
export function TitleScreen() {
  const start = useGameStore(s => s.start)
  const { progress, active } = useProgress()
  const saved = readSave()
  // Continue restores the saved journey; a new journey clears it. Both are user gestures, which audio needs.
  const begin = (journey: 'continue' | 'new') => {
    soundscape.start()
    if (journey === 'continue' && saved) { restore(route, saved, routeClock.now); spawnPoint.position = saved.position }
    else { clearSave(); resetProgress(route); flock.clear(); spawnPoint.position = null }
    start()
  }
  const ready = !active && progress >= 100
  return <div className="screen title-screen">
    <div className="keyart"/><div className="veil"/><Motes count={34}/>
    <div className="title-block">
      <div className="eyebrow"><Leaf/>一款温暖而神秘的 3D 森林探索游戏<Leaf className="flip"/></div>
      <h1 className="logo">流光之森</h1>
      <p className="logo-en">Lumenwood <em>Whispers of Light</em></p>
      <p className="tagline">一场关于探索、倾听与共生的森林之旅</p>
      <p className="description">唤醒花朵，带着萤火点亮灯火，穿过营地与湿地，去往山上的古树。</p>
      <div className="actions">
        <button className="primary" onClick={() => begin(saved ? 'continue' : 'new')}><Leaf/>{saved ? '继续旅程' : '开始探索'}<span className="arrow">→</span></button>
        {saved && <button className="secondary" onClick={() => begin('new')}>新的旅程</button>}
      </div>
      <div className="preload" aria-live="polite"><i style={{ transform: `scaleX(${progress / 100})` }}/>{ready ? '森林已经醒来' : `森林正在苏醒 · ${Math.round(progress)}%`}</div>
    </div>
    <div className="title-foot"><Settings/><Controls/></div>
  </div>
}
