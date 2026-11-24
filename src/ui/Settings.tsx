import { useRef } from 'react'
import { useGameStore, type Quality } from '../state/gameStore'
import { soundscape } from '../game/audio/engine'
import type { TimeSetting } from '../game/rendering/timeOfDay'
const qualityLabels: Record<Quality, string> = { low: '低', medium: '中', high: '高' }
const timeLabels: Record<TimeSetting, string> = { journey: '随旅程', day: '白天', twilight: '暮光', night: '夜晚' }

export function Settings() {
  const { quality, volume, timeOfDay, sensitivity, invertY, setQuality, setVolume, setTimeOfDay, setSensitivity, setInvertY } = useGameStore()
  const previewAt = useRef(0)
  const onVolume = (value: number) => {
    setVolume(value)
    const now = performance.now()
    if (value > 0 && now - previewAt.current > 180) {
      previewAt.current = now
      soundscape.start()
      soundscape.setVolume(value)
      soundscape.cue('preview')
    }
  }
  return <div className="settings">
    <label>时段 <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value as TimeSetting)}>{(Object.keys(timeLabels) as TimeSetting[]).map(t => <option key={t} value={t}>{timeLabels[t]}</option>)}</select></label>
    <label>画质 <select value={quality} onChange={e => setQuality(e.target.value as Quality)}>{(Object.keys(qualityLabels) as Quality[]).map(q => <option key={q} value={q}>{qualityLabels[q]}</option>)}</select></label>
    <label>音量 <input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => onVolume(Number(e.target.value))}/><small>{Math.round(volume * 100)}</small></label>
    <label>鼠标 <input aria-label="鼠标" type="range" min="0.4" max="2.5" step="0.1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))}/><small>{Math.round(sensitivity * 100)}%</small></label>
    <label className="toggle"><input aria-label="上下逆向" type="checkbox" checked={invertY} onChange={e => setInvertY(e.target.checked)}/>上下逆向</label>
  </div>
}

/** The control scheme as key caps. */
export function Controls() {
  return <div className="controls" aria-label="操作说明">
    <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span>
    <span><kbd className="wide">Shift</kbd>奔跑</span>
    <span><kbd className="wide">鼠标</kbd>环视</span>
    <span><kbd>E</kbd><kbd>Q</kbd>互动</span>
    <span><kbd>F</kbd>唤光</span>
    <span><kbd>T</kbd>指引</span>
    <span><kbd className="wide">Esc</kbd>暂停</span>
  </div>
}
