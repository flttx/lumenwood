import { useGameStore, type Quality } from '../state/gameStore'
import type { TimeOfDay } from '../game/rendering/timeOfDay'
import { requestLock } from '../game/input/focus'
import { soundscape } from '../game/audio/engine'
import { clearSave, readSave, restore, spawnPoint } from '../game/features/route/save'
import { resetProgress, route, routeClock } from '../game/features/route/progress'
import { flock } from '../game/features/route/flock'
const labels: Record<Quality, string> = { low: '低', medium: '中', high: '高' }
const timeLabels: Record<TimeOfDay, string> = { day: '白天', twilight: '暮光' }
export function Overlay() {
  const { phase, quality, volume, timeOfDay, pointerLocked, caption, endingCard, start, resume, title, setQuality, setVolume, setTimeOfDay, setEndingCard } = useGameStore()
  // Both buttons are user gestures, which browsers require before audio may start.
  const saved = phase === 'title' ? readSave() : null
  // Continue restores the saved journey; a new journey clears it. Both are user gestures, which audio needs.
  const begin = (journey: 'continue' | 'new') => {
    soundscape.start()
    if (journey === 'continue' && saved) { restore(route, saved, routeClock.now); spawnPoint.position = saved.position }
    else { clearSave(); resetProgress(route); flock.clear(); spawnPoint.position = null }
    start()
  }
  const closeEnding = () => { setEndingCard(false); requestLock(document.querySelector('.app canvas')) }
  if (endingCard) return <div className="overlay ending"><div className="panel">
    <div className="eyebrow">THE FOREST REMEMBERS</div><h1>森林被点亮了</h1>
    <p className="subtitle">L U M E N W O O D</p>
    <p className="description">你唤醒的每一朵花、点亮的每一盏灯，都汇进了古树的光里。森林会记住这一夜。</p>
    <button className="primary" onClick={closeEnding}>继续探索 <span>↗</span></button>
  </div></div>
  const resumeAndLook = () => { soundscape.start(); resume(); requestLock(document.querySelector('.app canvas')) }
  if (phase === 'playing') return <div className="hud"><div className="brand">LUMENWOOD <span> / 流光之森</span></div>{caption && <div key={caption.id} className="caption" role="status">{caption.text}</div>}<div className="hint">{pointerLocked ? <>W A S D 移动 <i/> SHIFT 奔跑 <i/> 移动鼠标环视 <i/> ESC 暂停</> : <>点击画面捕获鼠标以环视 <i/> W A S D 移动 <i/> ESC 暂停</>}</div></div>
  return <div className="overlay"><div className="panel">
    <div className="eyebrow">A FOREST WAITING TO BE FOUND</div><h1>{phase === 'title' ? '流光之森' : '稍作停留'}</h1>
    <p className="subtitle">{phase === 'title' ? 'L U M E N W O O D' : '森林会在这里等你。'}</p>
    <p className="description">{phase === 'title' ? '唤醒花朵，带着萤火点亮灯火，穿过营地与湿地，去往山上的古树。' : '继续后将自动捕获鼠标；若浏览器拒绝，请再点击画面。'}</p>
    {phase === 'title' ? <>
      <button className="primary" onClick={() => begin(saved ? 'continue' : 'new')}>{saved ? '继续旅程' : '开始探索'} <span>↗</span></button>
      {saved && <button className="secondary" onClick={() => begin('new')}>新的旅程</button>}
    </> : <button className="primary" onClick={resumeAndLook}>继续探索 <span>↗</span></button>}
    {phase === 'paused' && <button className="secondary" onClick={title}>返回标题</button>}
    <div className="settings"><label>时段 <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value as TimeOfDay)}>{(Object.keys(timeLabels) as TimeOfDay[]).map(t => <option key={t} value={t}>{timeLabels[t]}</option>)}</select></label>
      <label>画质 <select value={quality} onChange={e => setQuality(e.target.value as Quality)}>{(Object.keys(labels) as Quality[]).map(q => <option key={q} value={q}>{labels[q]}</option>)}</select></label>
      <label>音量 <input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))}/><small>{Math.round(volume * 100)}</small></label></div>
    <div className="foot">P4 · CAMP · WETLANDS · HIGHLANDS</div>
  </div></div>
}
