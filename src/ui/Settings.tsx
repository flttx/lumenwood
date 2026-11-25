import { useRef, useState, type CSSProperties } from 'react'
import { useGameStore, type Quality } from '../state/gameStore'
import { soundscape } from '../game/audio/engine'
import type { TimeSetting } from '../game/rendering/timeOfDay'
import { VolumeGlyph } from './decor'
const qualityLabels: Record<Quality, string> = { low: '低', medium: '中', high: '高' }
export const TIME_LABELS: Record<TimeSetting, string> = { journey: '随旅程', day: '白天', twilight: '暮光', night: '夜晚' }
const QUALITIES: Quality[] = ['low', 'medium', 'high']
export const TIME_ORDER: TimeSetting[] = ['journey', 'day', 'twilight', 'night']

export function Settings() {
  const {
    quality, volume, ambienceVolume, musicVolume, sfxVolume,
    timeOfDay, sensitivity, invertY, dragOnly, powerSave, scenicIdle,
    setQuality, setVolume, toggleMute, setAmbienceVolume, setMusicVolume, setSfxVolume,
    setTimeOfDay, setSensitivity, setInvertY, setDragOnly, setPowerSave, setScenicIdle,
  } = useGameStore()
  const [mixerOpen, setMixerOpen] = useState(false)
  const previewAt = useRef(0)
  const previewTone = (effective: number) => {
    const now = performance.now()
    if (effective > 0 && now - previewAt.current > 180) {
      previewAt.current = now
      soundscape.start()
      soundscape.cue('preview')
    }
  }
  const onVolume = (value: number) => {
    setVolume(value)
    soundscape.setVolume(value)
    previewTone(value)
  }
  const onToggleMute = () => {
    const next = toggleMute()
    soundscape.setVolume(next)
    previewTone(next)
  }
  const onChannel = (kind: 'ambience' | 'music' | 'sfx', value: number) => {
    if (kind === 'ambience') setAmbienceVolume(value)
    else if (kind === 'music') setMusicVolume(value)
    else setSfxVolume(value)
    const s = useGameStore.getState()
    soundscape.setChannelVolumes(s.ambienceVolume, s.musicVolume, s.sfxVolume)
    if (kind === 'sfx') previewTone(value * s.volume)
  }
  const resetDefaults = () => {
    setTimeOfDay('journey')
    setQuality('high')
    onVolume(0.7)
    setAmbienceVolume(1); setMusicVolume(1); setSfxVolume(1)
    soundscape.setChannelVolumes(1, 1, 1)
    setSensitivity(1)
    setInvertY(false)
    setDragOnly(false)
    setPowerSave(false)
    setScenicIdle(false)
  }
  const volPct = `${Math.round(volume * 100)}%`
  const ambPct = `${Math.round(ambienceVolume * 100)}%`
  const musPct = `${Math.round(musicVolume * 100)}%`
  const sfxPct = `${Math.round(sfxVolume * 100)}%`
  const sensPct = `${Math.round(((sensitivity - 0.4) / 2.1) * 100)}%`

  return <div className="settings settings-panel">
    <div className="settings-head">
      <span className="settings-heading">偏好设置</span>
      <button type="button" className="link-btn" onClick={resetDefaults}>恢复默认</button>
    </div>
    <div className="setting-item">
      <span className="setting-label">时段</span>
      <div className="seg-group" role="radiogroup" aria-label="时段">
        {TIME_ORDER.map(t => <button key={t} type="button" role="radio" aria-checked={timeOfDay === t} className={timeOfDay === t ? 'seg active' : 'seg'} onClick={() => setTimeOfDay(t)}>{TIME_LABELS[t]}</button>)}
      </div>
    </div>
    <div className="setting-item">
      <span className="setting-label">画质</span>
      <div className="seg-group" role="radiogroup" aria-label="画质">
        {QUALITIES.map(q => <button key={q} type="button" role="radio" aria-checked={quality === q} className={quality === q ? 'seg active' : 'seg'} onClick={() => setQuality(q)}>{qualityLabels[q]}</button>)}
      </div>
    </div>
    <div className="setting-item">
      <span className="setting-label">音量</span>
      <div className="range-wrap">
        <button type="button" className="icon-mute" onClick={onToggleMute} aria-label={volume > 0 ? '静音' : '取消静音'} title={volume > 0 ? '点击静音 (M)' : '恢复音量 (M)'}>
          <VolumeGlyph muted={volume <= 0}/>
        </button>
        <input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} style={{ '--fill': volPct } as CSSProperties} onChange={e => onVolume(Number(e.target.value))}/>
        <small>{Math.round(volume * 100)}%</small>
        <button type="button" className={mixerOpen ? 'mini-toggle active' : 'mini-toggle'} onClick={() => setMixerOpen(v => !v)} aria-expanded={mixerOpen} title="分别调节环境声、音乐与音效">分轨</button>
      </div>
    </div>
    {mixerOpen && <div className="audio-mixer" role="group" aria-label="分轨音量">
      <div className="setting-item compact">
        <span className="setting-label">环境白噪音</span>
        <div className="range-wrap">
          <input aria-label="环境白噪音" type="range" min="0" max="1" step="0.05" value={ambienceVolume} style={{ '--fill': ambPct } as CSSProperties} onChange={e => onChannel('ambience', Number(e.target.value))}/>
          <small>{Math.round(ambienceVolume * 100)}%</small>
        </div>
      </div>
      <div className="setting-item compact">
        <span className="setting-label">背景音乐</span>
        <div className="range-wrap">
          <input aria-label="背景音乐" type="range" min="0" max="1" step="0.05" value={musicVolume} style={{ '--fill': musPct } as CSSProperties} onChange={e => onChannel('music', Number(e.target.value))}/>
          <small>{Math.round(musicVolume * 100)}%</small>
        </div>
      </div>
      <div className="setting-item compact">
        <span className="setting-label">交互音效</span>
        <div className="range-wrap">
          <input aria-label="交互音效" type="range" min="0" max="1" step="0.05" value={sfxVolume} style={{ '--fill': sfxPct } as CSSProperties} onChange={e => onChannel('sfx', Number(e.target.value))}/>
          <small>{Math.round(sfxVolume * 100)}%</small>
        </div>
      </div>
    </div>}
    <div className="setting-item">
      <span className="setting-label">镜头灵敏度</span>
      <div className="range-wrap">
        <input aria-label="镜头灵敏度" type="range" min="0.4" max="2.5" step="0.1" value={sensitivity} style={{ '--fill': sensPct } as CSSProperties} onChange={e => setSensitivity(Number(e.target.value))}/>
        <small>{Math.round(sensitivity * 100)}%</small>
      </div>
    </div>
    <div className="toggle-grid" aria-label="操控与省电选项">
      <button type="button" role="switch" aria-checked={invertY} className={invertY ? 'toggle-chip active' : 'toggle-chip'} onClick={() => setInvertY(!invertY)} title="上下移动鼠标时反转抬头与低头方向">
        <span>上下反转</span><i>{invertY ? '开' : '关'}</i>
      </button>
      <button type="button" role="switch" aria-checked={dragOnly} className={dragOnly ? 'toggle-chip active' : 'toggle-chip'} onClick={() => setDragOnly(!dragOnly)} title="不锁定鼠标指针，仅通过按住左键拖拽转动视角">
        <span>自由光标</span><i>{dragOnly ? '开' : '关'}</i>
      </button>
      <button type="button" role="switch" aria-checked={powerSave} className={powerSave ? 'toggle-chip active' : 'toggle-chip'} onClick={() => setPowerSave(!powerSave)} title="限制为 30 帧并降低渲染倍率，适合轻薄笔记本续航">
        <span>省电 30 帧</span><i>{powerSave ? '开' : '关'}</i>
      </button>
      <button type="button" role="switch" aria-checked={scenicIdle} className={scenicIdle ? 'toggle-chip active' : 'toggle-chip'} onClick={() => setScenicIdle(!scenicIdle)} title="切换其他窗口时不自动暂停，可留在后台听风声与篝火">
        <span>后台白噪音</span><i>{scenicIdle ? '开' : '关'}</i>
      </button>
    </div>
  </div>
}

/** Compact control scheme shown in the pause menu. */
export function Controls() {
  return <div className="controls" aria-label="操作说明">
    <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span>
    <span><kbd className="wide">Shift</kbd>奔跑</span>
    <span><kbd className="wide">Space</kbd>跳跃</span>
    <span><kbd>E</kbd><kbd>Q</kbd>互动</span>
    <span><kbd>F</kbd>/右键 唤光</span>
    <span><kbd>M</kbd>静音</span>
    <span><kbd>N</kbd>时段</span>
    <span><kbd>H</kbd>观景</span>
    <span><kbd>P</kbd>拍照</span>
    <span><kbd>T</kbd>指引</span>
    <span><kbd>R</kbd>漫步</span>
    <span><kbd className="wide">Tab</kbd>手账</span>
    <span>滚轮 镜距</span>
  </div>
}
