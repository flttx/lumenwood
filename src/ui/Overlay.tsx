import { useGameStore, type Quality } from '../state/gameStore'
import type { TimeOfDay } from '../game/rendering/timeOfDay'
import { requestLock } from '../game/input/focus'
const labels: Record<Quality, string> = { low: '低', medium: '中', high: '高' }
const timeLabels: Record<TimeOfDay, string> = { day: '白天', twilight: '暮光' }
export function Overlay() {
  const { phase, quality, volume, timeOfDay, pointerLocked, start, resume, title, setQuality, setVolume, setTimeOfDay } = useGameStore()
  const resumeAndLook = () => { resume(); requestLock(document.querySelector('.app canvas')) }
  if (phase === 'playing') return <div className="hud"><div className="brand">LUMENWOOD <span> / 林间营地样板</span></div><div className="hint">{pointerLocked ? <>W A S D 移动 <i/> SHIFT 奔跑 <i/> 移动鼠标环视 <i/> ESC 暂停</> : <>点击画面捕获鼠标以环视 <i/> W A S D 移动 <i/> ESC 暂停</>}</div></div>
  return <div className="overlay"><div className="panel">
    <div className="eyebrow">A FOREST WAITING TO BE FOUND</div><h1>{phase === 'title' ? '流光之森' : '稍作停留'}</h1>
    <p className="subtitle">{phase === 'title' ? 'L U M E N W O O D' : '森林会在这里等你。'}</p>
    <p className="description">{phase === 'title' ? '走进一片尚在生长的森林。此版本为林间营地的视觉与声音样板。' : '继续后将自动捕获鼠标；若浏览器拒绝，请再点击画面。'}</p>
    <button className="primary" onClick={phase === 'title' ? start : resumeAndLook}>{phase === 'title' ? '开始探索' : '继续探索'} <span>↗</span></button>
    {phase === 'paused' && <button className="secondary" onClick={title}>返回标题</button>}
    <div className="settings"><label>时段 <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value as TimeOfDay)}>{(Object.keys(timeLabels) as TimeOfDay[]).map(t => <option key={t} value={t}>{timeLabels[t]}</option>)}</select></label>
      <label>画质 <select value={quality} onChange={e => setQuality(e.target.value as Quality)}>{(Object.keys(labels) as Quality[]).map(q => <option key={q} value={q}>{labels[q]}</option>)}</select></label>
      <label>音量 <input aria-label="音量（预留）" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))}/><small>预留</small></label></div>
    <div className="foot">P2 · CAMP VISUAL SAMPLE</div>
  </div></div>
}
