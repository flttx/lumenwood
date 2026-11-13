import { useGameStore, type Quality } from '../state/gameStore'
import type { TimeSetting } from '../game/rendering/timeOfDay'
const qualityLabels: Record<Quality, string> = { low: '低', medium: '中', high: '高' }
const timeLabels: Record<TimeSetting, string> = { journey: '随旅程', day: '白天', twilight: '暮光', night: '夜晚' }

export function Settings() {
  const { quality, volume, timeOfDay, setQuality, setVolume, setTimeOfDay } = useGameStore()
  return <div className="settings">
    <label>时段 <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value as TimeSetting)}>{(Object.keys(timeLabels) as TimeSetting[]).map(t => <option key={t} value={t}>{timeLabels[t]}</option>)}</select></label>
    <label>画质 <select value={quality} onChange={e => setQuality(e.target.value as Quality)}>{(Object.keys(qualityLabels) as Quality[]).map(q => <option key={q} value={q}>{qualityLabels[q]}</option>)}</select></label>
    <label>音量 <input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))}/><small>{Math.round(volume * 100)}</small></label>
  </div>
}

/** The control scheme as key caps. */
export function Controls() {
  return <div className="controls" aria-label="操作说明">
    <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span>
    <span><kbd className="wide">Shift</kbd>奔跑</span>
    <span><kbd className="wide">鼠标</kbd>环视</span>
    <span><kbd className="wide">Esc</kbd>暂停</span>
  </div>
}
