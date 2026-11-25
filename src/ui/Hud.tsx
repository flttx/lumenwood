import { Fragment, useEffect, useRef, useState } from 'react'
import { useGameStore, type RegionId } from '../state/gameStore'
import { pulseReach } from '../game/features/resonance/resonance'
import { SECRET_IDS } from '../game/features/route/progress'
import type { TimeSetting } from '../game/rendering/timeOfDay'
import { soundscape } from '../game/audio/engine'
import { requestPhoto } from '../game/rendering/photo'
import { CameraGlyph, EyeGlyph, JournalGlyph, LanternGlyph, Leaf, PauseGlyph, SeedGlyph, SparkGlyph, TimeGlyph, VolumeGlyph } from './decor'
import { TIME_LABELS, TIME_ORDER } from './Settings'
import { Objective } from './Objective'
import { SunlightPanel } from './SunlightPanel'
export const REGION_NAMES: Record<RegionId, [string, string]> = {
  camp: ['林间营地', 'The Forest Camp'],
  wetland: ['萤光湿地', 'The Glimmering Wetland'],
  glade: ['隐秘空地', 'The Hidden Glade'],
  highland: ['古树高地', 'The Ancient Highland'],
  glen: ['瀑布溪谷', 'The Waterfall Glen'],
  hollow: ['蘑菇幽谷', 'The Mushroom Hollow'],
  lake: ['镜湖', 'The Mirror Lake'],
  overlook: ['悬崖眺望台', 'The Cliff Overlook'],
  beach: ['月牙海湾', 'The Crescent Cove'],
  vale: ['阳石林谷', 'The Sunstone Vale'],
  reef: ['望海石台', 'The Tidewater Reef'],
  starcliff: ['北崖星台', 'The Starlight Terrace'],
}

/** Highlights inline key hints like "按 E" or "按 F" as tactile key caps while keeping the exact text readable. */
function formatPrompt(text: string) {
  const parts = text.split(/(按\s*[A-Z])/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    const m = /^按\s*([A-Z])$/.exec(part)
    return m ? <span key={i} className="prompt-key">按<kbd>{m[1]}</kbd></span> : <Fragment key={i}>{part}</Fragment>
  })
}

/** In-play overlay: streamlined brand, lantern tally, direct time switcher, objective, captions and quiet hint. */
export function Hud() {
  const pointerLocked = useGameStore(s => s.pointerLocked), caption = useGameStore(s => s.caption)
  const captionQueued = useGameStore(s => s.captionQueue.length > 0), advanceCaption = useGameStore(s => s.advanceCaption)
  const region = useGameStore(s => s.region), clearRegion = useGameStore(s => s.clearRegion)
  const journey = useGameStore(s => s.journey), seeds = useGameStore(s => s.seeds)
  const prompt = useGameStore(s => s.prompt), resonanceHud = useGameStore(s => s.resonanceHud)
  const timeOfDay = useGameStore(s => s.timeOfDay), setTimeOfDay = useGameStore(s => s.setTimeOfDay)
  const volume = useGameStore(s => s.volume), toggleMute = useGameStore(s => s.toggleMute)
  const dragOnly = useGameStore(s => s.dragOnly), autoWalk = useGameStore(s => s.autoWalk)
  const journalOpen = useGameStore(s => s.journalOpen), setJournalOpen = useGameStore(s => s.setJournalOpen)
  const pause = useGameStore(s => s.pause)
  const [minimal, setMinimal] = useState(false)
  const [timeMenuOpen, setTimeMenuOpen] = useState(false)
  const [shutterId, setShutterId] = useState(0)
  const [toast, setToast] = useState<{ kind: 'time' | 'mute' | 'guide' | 'photo'; label: string; id: number } | null>(null)
  const timeWrapRef = useRef<HTMLDivElement>(null)
  const showTimeMenu = timeMenuOpen && !pointerLocked
  const onToggleMute = () => {
    const next = toggleMute()
    soundscape.setVolume(next)
    setToast({ kind: 'mute', label: next <= 0 ? '已静音' : `音量 ${Math.round(next * 100)}%`, id: Date.now() })
  }
  const onTakePhoto = () => {
    requestPhoto(ok => {
      if (ok) setShutterId(Date.now())
      setToast({ kind: 'photo', label: ok ? '已保存纯净风景照' : '暂时无法保存截图', id: Date.now() })
    })
  }
  // H toggles scenic minimal HUD; N cycles time-of-day; M toggles mute; P captures clean scenery; T shows guidance toast; Tab opens journal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = useGameStore.getState()
      if (e.code === 'Tab') {
        e.preventDefault()
        setJournalOpen(!s.journalOpen)
        return
      }
      if (s.journalOpen) return
      if (e.code === 'KeyH') setMinimal(v => !v)
      else if (e.code === 'KeyP') {
        e.preventDefault()
        requestPhoto(ok => {
          if (ok) setShutterId(Date.now())
          setToast({ kind: 'photo', label: ok ? '已保存纯净风景照' : '暂时无法保存截图', id: Date.now() })
        })
      } else if (e.code === 'KeyM') {
        const next = s.toggleMute()
        soundscape.setVolume(next)
        setToast({ kind: 'mute', label: next <= 0 ? '已静音' : `音量 ${Math.round(next * 100)}%`, id: Date.now() })
      } else if (e.code === 'KeyT') {
        const obj = s.objective
        if (obj && obj.distance !== null) {
          setToast({ kind: 'guide', label: `指引 · ${obj.direction} ${obj.distance} 米`, id: Date.now() })
        }
      } else if (e.code === 'KeyN') {
        const cur = s.timeOfDay
        const next = TIME_ORDER[(TIME_ORDER.indexOf(cur) + 1) % TIME_ORDER.length]
        setTimeOfDay(next)
        setToast({ kind: 'time', label: `时段 · ${TIME_LABELS[next]}`, id: Date.now() })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setTimeOfDay, setJournalOpen])
  useEffect(() => {
    if (!showTimeMenu) return
    const onDown = (e: MouseEvent) => {
      if (timeWrapRef.current && !timeWrapRef.current.contains(e.target as Node)) setTimeMenuOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [showTimeMenu])
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(id)
  }, [toast])
  // When another caption is waiting in the FIFO queue, advance briskly instead of sitting through the full 7s fade.
  useEffect(() => {
    if (!caption || !captionQueued) return
    const id = window.setTimeout(() => advanceCaption(caption.id), 4200)
    return () => window.clearTimeout(id)
  }, [caption, captionQueued, advanceCaption])
  const pickTime = (mode: TimeSetting) => {
    setTimeOfDay(mode)
    setTimeMenuOpen(false)
    setToast({ kind: 'time', label: `时段 · ${TIME_LABELS[mode]}`, id: Date.now() })
  }
  const activePrompt = prompt ?? (autoWalk ? '自动漫步中 · 按 R 或方向键停步' : null)
  return <div className={minimal ? 'hud hud-minimal' : 'hud'}>
    <div className="hud-top">
      <div className="brand">
        <span className="logo-mini">流光之森</span>
        <span className="brand-sub">{region ? REGION_NAMES[region.name][0] : '林间营地'}</span>
      </div>
      <div className="hud-right">
        {journey.total > 0 && <div className="tally" aria-label={`已点亮灯火 ${journey.lit} / ${journey.total}，携带萤火 ${journey.carried}`}>
          <div className="lanterns">
            {Array.from({ length: journey.total }, (_, i) => <Fragment key={i}>
              {i > 0 && i % 3 === 0 && <span className="lantern-sep" aria-hidden="true"/>}
              <LanternGlyph lit={i < journey.lit}/>
            </Fragment>)}
          </div>
          <div className="tally-stats">
            <span className="carried"><i/>萤火 {journey.carried}</span>
            {seeds.found > 0 && <span className="carried seeds" aria-label={`光之种子 ${seeds.found} / ${seeds.total}`}><SeedGlyph className="hud-ico"/>种子 {seeds.found}/{seeds.total} · 唤光 {Math.round(pulseReach(seeds.found))}m</span>}
            {resonanceHud.secrets > 0 && <span className="carried" aria-label={`秘境 ${resonanceHud.secrets} / ${SECRET_IDS.length}`}><SparkGlyph className="hud-ico"/>秘境 {resonanceHud.secrets}/{SECRET_IDS.length}</span>}
          </div>
          {(region?.name === 'wetland' || region?.name === 'lake' || region?.name === 'vale') && journey.wetlandLit < 3 && <div className="carried wetland-note">湿地灯火 {journey.wetlandLit}/3 · 点亮全部开启光桥</div>}
        </div>}
        <div className="hud-bar" ref={timeWrapRef}>
          <button type="button" className={showTimeMenu ? 'hud-time-btn active' : 'hud-time-btn'} onClick={() => setTimeMenuOpen(v => !v)} aria-label="切换时段" aria-expanded={showTimeMenu} title="切换时段 (N)">
            <TimeGlyph mode={timeOfDay}/><span>{TIME_LABELS[timeOfDay]}</span>
          </button>
          <span className="hud-bar-sep" aria-hidden="true"/>
          <button type="button" className={volume <= 0 ? 'hud-bar-icon active' : 'hud-bar-icon'} onClick={onToggleMute} aria-label={volume > 0 ? '静音' : '取消静音'} title={volume > 0 ? '一键静音 (M)' : '恢复声音 (M)'}>
            <VolumeGlyph muted={volume <= 0}/>
          </button>
          <button type="button" className={journalOpen ? 'hud-bar-icon active' : 'hud-bar-icon'} onClick={() => setJournalOpen(!journalOpen)} aria-label="岛屿手账" title="流光岛屿手账 (Tab)">
            <JournalGlyph/>
          </button>
          <button type="button" className="hud-bar-icon" onClick={onTakePhoto} aria-label="保存风景照" title="保存纯净风景照 (P)">
            <CameraGlyph/>
          </button>
          <button type="button" className={minimal ? 'hud-bar-icon active' : 'hud-bar-icon'} onClick={() => setMinimal(v => !v)} aria-label={minimal ? '显示界面' : '隐藏界面'} title={minimal ? '显示界面 (H)' : '观景模式 (H)'}>
            <EyeGlyph hidden={minimal}/>
          </button>
          <button type="button" className="hud-bar-icon" onClick={pause} aria-label="暂停与设置" title="暂停与设置 (Esc)">
            <PauseGlyph/>
          </button>
          {showTimeMenu && <div className="time-menu glass-card" role="menu" aria-label="选择时段">
            {TIME_ORDER.map(t => <button key={t} type="button" role="menuitemradio" aria-checked={timeOfDay === t} className={timeOfDay === t ? 'time-opt active' : 'time-opt'} onClick={() => pickTime(t)}>
              <TimeGlyph mode={t}/><span>{TIME_LABELS[t]}</span>
            </button>)}
          </div>}
        </div>
      </div>
    </div>
    <Objective/>
    <SunlightPanel/>
    {shutterId > 0 && <div key={`shutter-${shutterId}`} className="shutter-flash" aria-hidden="true" onAnimationEnd={() => setShutterId(0)}/>}
    {toast && <div key={`toast-${toast.id}`} className="time-toast">{toast.kind === 'mute' ? <VolumeGlyph muted={volume <= 0}/> : toast.kind === 'guide' ? <SparkGlyph/> : toast.kind === 'photo' ? <CameraGlyph/> : <TimeGlyph mode={timeOfDay}/>}{toast.label}</div>}
    {region?.visible && <div key={`region-${region.id}`} className="region-banner" aria-live="polite" onAnimationEnd={() => clearRegion(region.id)}>
      <div className="rule"><Leaf/></div>
      <div className="region-name">{REGION_NAMES[region.name][0]}</div>
      <div className="region-en">{REGION_NAMES[region.name][1]}</div>
    </div>}
    {caption && <div key={`caption-${caption.id}`} className="caption" role="status" onAnimationEnd={() => advanceCaption(caption.id)}><Leaf/><span>{caption.text}</span></div>}
    {(activePrompt || resonanceHud.combo >= 2) && <div key={`prompt-${activePrompt ?? `combo-${resonanceHud.combo}`}`} className={activePrompt ? 'world-prompt' : 'world-prompt combo'}>
      {activePrompt ? formatPrompt(activePrompt) : <>
        <SparkGlyph className="hud-ico"/>
        <span>流光连行 ×{resonanceHud.combo}</span>
        {resonanceHud.flow > 0 && <span className="flow-bar" aria-hidden="true"><i style={{ transform: `scaleX(${resonanceHud.flow})` }}/></span>}
      </>}
    </div>}
    {/* Re-keyed on lock changes so the hint shows again (then fades) whenever play resumes. */}
    <div key={`hint-${pointerLocked}-${dragOnly}`} className={pointerLocked || dragOnly ? 'hint fades' : 'hint'}>
      {pointerLocked
        ? <><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span><span><kbd className="wide">Shift</kbd>奔跑</span><span>移动鼠标环视</span><span><kbd>F</kbd>唤光</span><span><kbd>M</kbd>静音</span><span><kbd className="wide">Tab</kbd>手账</span><span><kbd className="wide">Esc</kbd>暂停</span></>
        : dragOnly
          ? <><span>按住左键拖拽环视</span><span><kbd>F</kbd>唤光</span><span><kbd>M</kbd>静音</span><span><kbd className="wide">Tab</kbd>手账</span><span><kbd className="wide">Esc</kbd>暂停</span></>
          : <><span className="click"><span className="click-dot"/>点击画面捕获鼠标以环视</span><span>或按住左键拖拽环视</span><span><kbd>F</kbd>唤光</span><span><kbd>M</kbd>静音</span><span><kbd className="wide">Esc</kbd>暂停</span></>}
    </div>
  </div>
}
