import { useGameStore, type RegionId } from '../state/gameStore'
import { Leaf, LanternGlyph } from './decor'
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
}

/** In-play overlay: brand, lantern tally, region banner, guidance caption and the control hint. */
export function Hud() {
  const { pointerLocked, caption, region, journey, seeds } = useGameStore()
  return <div className="hud">
    <div className="hud-top">
      <div className="brand"><span className="logo-mini">流光之森</span><span>LUMENWOOD</span></div>
      {journey.total > 0 && <div className="tally" aria-label={`已点亮灯火 ${journey.lit} / ${journey.total}，携带萤火 ${journey.carried}`}>
        <div className="lanterns">{Array.from({ length: journey.total }, (_, i) => <LanternGlyph key={i} lit={i < journey.lit}/>)}</div>
        <div className="carried"><i/>萤火 {journey.carried}</div>
        {seeds.found > 0 && <div className="carried seeds" aria-label={`光之种子 ${seeds.found} / ${seeds.total}`}><i/>光之种子 {seeds.found}/{seeds.total}</div>}
      </div>}
    </div>
    {region && <div key={region.id} className="region-banner" aria-hidden="true">
      <div className="rule"><Leaf/></div>
      <div className="region-name">{regionNames[region.name][0]}</div>
      <div className="region-en">{regionNames[region.name][1]}</div>
    </div>}
    {caption && <div key={caption.id} className="caption" role="status"><Leaf/><span>{caption.text}</span></div>}
    {/* Re-keyed on lock changes so the hint shows again (then fades) whenever play resumes. */}
    <div key={String(pointerLocked)} className={pointerLocked ? 'hint fades' : 'hint'}>
      {pointerLocked
        ? <><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span><span><kbd className="wide">Shift</kbd>奔跑</span><span>移动鼠标环视</span><span><kbd className="wide">Esc</kbd>暂停</span></>
        : <><span className="click">点击画面捕获鼠标以环视</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>移动</span><span><kbd className="wide">Esc</kbd>暂停</span></>}
    </div>
  </div>
}
