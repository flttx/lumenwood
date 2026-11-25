import { useGameStore } from '../state/gameStore'
import { requestLock } from '../game/input/focus'
import { soundscape } from '../game/audio/engine'
import { flushLiveSave } from '../game/features/route/save'
import { route, SECRET_IDS } from '../game/features/route/progress'
import { LanternGlyph, Leaf, Motes, SeedGlyph, SparkGlyph } from './decor'
import { Controls, Settings } from './Settings'
import { TitleScreen } from './TitleScreen'
import { LoadingVeil } from './LoadingVeil'
import { Hud, REGION_NAMES } from './Hud'
import { JournalModal } from './JournalModal'
const canvas = () => document.querySelector('.app canvas')

/** Picks the screen for the current phase; the loading veil sits over play until the world is ready. */
export function Overlay() {
  const phase = useGameStore(s => s.phase)
  const endingCard = useGameStore(s => s.endingCard)
  const contextLost = useGameStore(s => s.contextLost)
  const journalOpen = useGameStore(s => s.journalOpen)
  if (phase === 'title') return <TitleScreen/>
  return <>
    {contextLost ? <ContextLostScreen/> : endingCard ? <EndingCard/> : phase === 'paused' ? <PauseScreen/> : <>
      <Hud/>
      {journalOpen && <JournalModal/>}
    </>}
    <LoadingVeil/>
  </>
}

function ContextLostScreen() {
  return <div className="screen pause-screen" role="alertdialog" aria-modal="true" aria-label="画面暂时失去连接">
    <div className="panel centred glass-card">
      <div className="eyebrow"><Leaf/>WEBGL CONTEXT LOST<Leaf className="flip"/></div>
      <h1 className="logo">画面暂时中断</h1>
      <p className="description">图形渲染上下文暂时断开，请稍候片刻或刷新页面重新步入森林。</p>
      <div className="actions"><button className="primary" onClick={() => window.location.reload()}><Leaf/>重新进入森林<span className="arrow">→</span></button></div>
    </div>
  </div>
}

function PauseScreen() {
  const resume = useGameStore(s => s.resume)
  const title = useGameStore(s => s.title)
  const journey = useGameStore(s => s.journey)
  const seeds = useGameStore(s => s.seeds)
  const region = useGameStore(s => s.region)
  const dragOnly = useGameStore(s => s.dragOnly)
  const secrets = useGameStore(s => s.resonanceHud.secrets)
  const resumeAndLook = () => { soundscape.start(); resume(); requestLock(canvas()) }
  const backToTitle = () => { flushLiveSave(route); title() }
  const areaLabel = region ? REGION_NAMES[region.name][0] : '林间营地'
  return <div className="screen pause-screen" role="dialog" aria-modal="true" aria-label="稍作停留">
    <div className="pause-grid">
      <div className="panel pause-left">
        <div className="eyebrow"><Leaf/>THE FOREST WAITS<Leaf className="flip"/></div>
        <h1 className="logo">稍作停留</h1>
        <p className="tagline">风声与灯火会在这里等你</p>
        <div className="pause-summary" aria-label="探索进度">
          <div className="summary-row"><span className="summary-k">当前所在</span><strong>{areaLabel}</strong></div>
          <div className="summary-stats">
            <span className="stat-chip"><LanternGlyph lit/>灯火 {journey.lit}/{journey.total || 9}</span>
            <span className="stat-chip"><SeedGlyph/>种子 {seeds.found}/{seeds.total || 16}</span>
            <span className="stat-chip"><SparkGlyph/>秘境 {secrets}/{SECRET_IDS.length}</span>
          </div>
        </div>
        <div className="actions">
          <button className="primary" onClick={resumeAndLook} autoFocus><Leaf/>继续探索<span className="arrow">→</span></button>
          <button className="secondary" onClick={backToTitle}>返回标题</button>
        </div>
        <p className="pause-note"><kbd className="wide">Esc</kbd>{dragOnly ? ' 随时回到森林 · 按住左键拖拽环视' : ' 随时回到森林 · 点击画面锁视角或拖拽环视'}</p>
      </div>
      <div className="pause-right glass-card">
        <Settings/>
      </div>
      <div className="pause-controls-bar glass-card">
        <span className="settings-heading">操控按键</span>
        <Controls/>
      </div>
    </div>
  </div>
}

function EndingCard() {
  const setEndingCard = useGameStore(s => s.setEndingCard)
  const resume = useGameStore(s => s.resume)
  const title = useGameStore(s => s.title)
  const seeds = useGameStore(s => s.seeds)
  const journey = useGameStore(s => s.journey)
  const secrets = useGameStore(s => s.resonanceHud.secrets)
  const close = () => { soundscape.start(); setEndingCard(false); resume(); requestLock(canvas()) }
  const backToTitle = () => { flushLiveSave(route); title() }
  const missingSunSeed = !route.seedsAt.has(8)
  return <div className="screen ending-screen" role="dialog" aria-modal="true" aria-label="森林被点亮了">
    <Motes count={40} seed={31}/>
    <div className="panel centred glass-card ending-card">
      <div className="eyebrow"><Leaf/>THE FOREST REMEMBERS<Leaf className="flip"/></div>
      <h1 className="logo">森林被点亮了</h1>
      <p className="logo-en">Lumenwood <em>Whispers of Light</em></p>
      <p className="description">你唤醒的每一朵花、点亮的每一盏灯，都汇进了古树的光里。森林会记住这一夜。</p>
      <div className="ending-stats">
        <span className="stat-chip"><LanternGlyph lit/>点亮灯火 {journey.lit}/{journey.total || 9}</span>
        {seeds.total > 0 && <span className="stat-chip"><SeedGlyph/>光之种子 {seeds.found}/{seeds.total}</span>}
        <span className="stat-chip"><SparkGlyph/>秘境回响 {secrets}/{SECRET_IDS.length}</span>
      </div>
      {seeds.total > 0 && <p className="description seeds-line">{seeds.found === seeds.total ? '每一颗光之种子都回到了森林的怀抱。' : `已收集光之种子 ${seeds.found} / ${seeds.total}。还有几颗微光静候在溪谷、幽谷、湖心、崖边、东谷、南湾与北崖${missingSunSeed ? '（及营地日光镜对岸）' : ''}，按 Tab 可翻开手账查看。`}</p>}
      <div className="actions">
        <button className="primary" onClick={close} autoFocus><Leaf/>继续探索<span className="arrow">→</span></button>
        <button className="secondary" onClick={backToTitle}>返回标题</button>
      </div>
    </div>
  </div>
}
