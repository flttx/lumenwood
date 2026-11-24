import { useEffect } from 'react'
import { useGameStore, type RegionId } from '../state/gameStore'
import { pulseReach } from '../game/features/resonance/resonance'
import { SECRET_IDS } from '../game/features/route/progress'
import { Leaf, LanternGlyph } from './decor'
import { Objective } from './Objective'
import { SunlightPanel } from './SunlightPanel'
const regionNames: Record<RegionId, [string, string]> = {
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

/** In-play overlay: brand, lantern tally, region banner, guidance caption and the control hint. */
export function Hud() {
  const pointerLocked = useGameStore(s => s.pointerLocked), caption = useGameStore(s => s.caption)
  const captionQueued = useGameStore(s => s.captionQueue.length > 0), advanceCaption = useGameStore(s => s.advanceCaption)
  const region = useGameStore(s => s.region), clearRegion = useGameStore(s => s.clearRegion)
  const journey = useGameStore(s => s.journey), seeds = useGameStore(s => s.seeds)
  const prompt = useGameStore(s => s.prompt), resonanceHud = useGameStore(s => s.resonanceHud)
  // When another caption is waiting in the FIFO queue, advance briskly instead of sitting through the full 7s fade.
  useEffect(() => {
    if (!caption || !captionQueued) return
    const id = window.setTimeout(() => advanceCaption(caption.id), 4200)
    return () => window.clearTimeout(id)
  }, [caption, captionQueued, advanceCaption])
  return <div className="hud">
    <div className="hud-top">
      <div className="brand"><span className="logo-mini">流光之森</span><span>LUMENWOOD</span></div>
      {journey.total > 0 && <div className="tally" aria-label={`已点亮灯火 ${journey.lit} / ${journey.total}，携带萤火 ${journey.carried}`}>
        <div className="lanterns">{Array.from({ length: journey.total }, (_, i) => <LanternGlyph key={i} lit={i < journey.lit}/>)}</div>
        <div className="carried"><i/>萤火 {journey.carried}</div>
        {(region?.name === 'wetland' || region?.name === 'lake' || region?.name === 'vale') && journey.wetlandLit < 3 && <div className="carried">湿地灯火 {journey.wetlandLit}/3 · 点亮全部开启光桥</div>}
        {seeds.found > 0 && <div className="carried seeds" aria-label={`光之种子 ${seeds.found} / ${seeds.total}`}><i/>光之种子 {seeds.found}/{seeds.total} · 唤光 {Math.round(pulseReach(seeds.found))} 米</div>}
        {resonanceHud.secrets > 0 && <div className="carried" aria-label={`秘密 ${resonanceHud.secrets} / ${SECRET_IDS.length}`}><i/>秘密 {resonanceHud.secrets}/{SECRET_IDS.length}</div>}
      </div>}
    </div>
    <Objective/>
    <SunlightPanel/>
    {region?.visible && <div key={region.id} className="region-banner" aria-live="polite" onAnimationEnd={() => clearRegion(region.id)}>
      <div className="rule"><Leaf/></div>
      <div className="region-name">{regionNames[region.name][0]}</div>
      <div className="region-en">{regionNames[region.name][1]}</div>
    </div>}
    {caption && <div key={caption.id} className="caption" role="status" onAnimationEnd={() => advanceCaption(caption.id)}><Leaf/><span>{caption.text}</span></div>}
    {(prompt || resonanceHud.combo >= 2) && <div key={prompt ?? `combo-${resonanceHud.combo}`} className="world-prompt">{prompt ?? `流光连行 ×${resonanceHud.combo}`}</div>}
    {/* Re-keyed on lock changes so the hint shows again (then fades) whenever play resumes. */}
    <div key={String(pointerLocked)} className={pointerLocked ? 'hint fades' : 'hint'}>
      {pointerLocked
        ? <><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span><span><kbd className="wide">Shift</kbd>奔跑</span><span><kbd>F</kbd>唤光</span><span>移动鼠标环视</span><span><kbd className="wide">Esc</kbd>暂停</span></>
        : <><span className="click">点击画面捕获鼠标以环视</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span><span><kbd>F</kbd>唤光</span><span><kbd className="wide">Esc</kbd>暂停</span></>}
    </div>
  </div>
}
