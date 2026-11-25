import { useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { soundscape } from '../game/audio/engine'
import { clearSave, readSave, restore, spawnPoint } from '../game/features/route/save'
import { route, SECRET_IDS } from '../game/features/route/progress'
import { seeds as seedSpots } from '../game/world/zones/sideLayout'
import { resetSessionState } from '../game/session'
import { useGameStore } from '../state/gameStore'
import { GearGlyph, Leaf, Motes, SparkGlyph } from './decor'
import { Settings } from './Settings'

/** Title: clean full-bleed twilight key art, focal logo & CTA, and a collapsible settings popover. */
export function TitleScreen() {
  const start = useGameStore(s => s.start)
  const { progress, active, errors } = useProgress()
  const saved = useMemo(() => readSave(), [])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const saveSummary = useMemo(() => {
    if (!saved) return null
    const lit = saved.lit.filter(Boolean).length
    return { lit, total: saved.lit.length, seeds: saved.seeds.length, secrets: saved.secrets.length }
  }, [saved])
  useEffect(() => {
    if (!settingsOpen) return
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSettingsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape') setSettingsOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [settingsOpen])
  // Continue restores the saved journey; a new journey clears it. Both are user gestures, which audio needs.
  const begin = (journey: 'continue' | 'new') => {
    soundscape.start()
    if (journey === 'continue' && saved) {
      resetSessionState(false)
      restore(route, saved, 0)
      spawnPoint.position = saved.position
      spawnPoint.view = saved.view ?? null
    } else {
      clearSave()
      resetSessionState(true)
    }
    start()
  }
  const hasError = errors.length > 0
  const ready = !active && progress >= 100 && !hasError
  return <div className="screen title-screen">
    <div className="keyart"/><div className="veil"/><Motes count={30}/>
    <div className="title-top-actions" ref={popoverRef}>
      <button type="button" className={settingsOpen ? 'pill-btn active' : 'pill-btn'} onClick={() => setSettingsOpen(v => !v)} aria-expanded={settingsOpen}>
        <GearGlyph/><span>设置</span>
      </button>
      {settingsOpen && <div className="title-popover glass-card"><Settings/></div>}
    </div>
    <div className="title-block">
      <div className="eyebrow stagger s1"><Leaf/>林间拾光 · 静谧探索<Leaf className="flip"/></div>
      <h1 className="logo stagger s2">流光之森</h1>
      <p className="logo-en stagger s2">Lumenwood <em>Whispers of Light</em></p>
      <p className="tagline stagger s3">倾听林间微光，与森林一起苏醒</p>
      <p className="description stagger s3">借一束日光生出藤桥，携林间萤火点亮暮色，走上高地唤醒沉睡的古树。</p>
      <div className="actions stagger s4">
        <button className="primary" onClick={() => begin(saved ? 'continue' : 'new')}>
          <Leaf/>
          <span className="btn-body">
            <span>{saved ? '继续旅程' : '开始探索'}</span>
            {saveSummary && <small className="save-meta">灯火 {saveSummary.lit}/{saveSummary.total}{saveSummary.seeds > 0 ? ` · 种子 ${saveSummary.seeds}/${seedSpots.length}` : ''}{saveSummary.secrets > 0 ? ` · 秘境 ${saveSummary.secrets}/${SECRET_IDS.length}` : ''}</small>}
          </span>
          <span className="arrow">→</span>
        </button>
        {saved && <button className="secondary" onClick={() => begin('new')}>新的旅程</button>}
      </div>
      <div className={ready ? 'preload ready stagger s5' : 'preload stagger s5'} aria-live="polite">
        <span className="preload-track"><i style={{ transform: `scaleX(${progress / 100})` }}/></span>
        <span className="preload-text">
          {ready && <SparkGlyph className="preload-star"/>}
          {hasError ? '森林暂时无法加载，请刷新页面重试。' : ready ? '森林已经醒来' : `森林正在苏醒 · ${Math.round(progress)}%`}
        </span>
      </div>
    </div>
    <div className="title-foot">
      <span className="title-quiet-hint">WASD 移动 · 鼠标/拖拽环视 · F 唤光 · M 静音 · Tab 手账 · Esc 暂停</span>
    </div>
  </div>
}
