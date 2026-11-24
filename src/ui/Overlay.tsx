import { useGameStore } from '../state/gameStore'
import { requestLock } from '../game/input/focus'
import { soundscape } from '../game/audio/engine'
import { flushLiveSave } from '../game/features/route/save'
import { route } from '../game/features/route/progress'
import { Leaf, Motes } from './decor'
import { Controls, Settings } from './Settings'
import { TitleScreen } from './TitleScreen'
import { LoadingVeil } from './LoadingVeil'
import { Hud } from './Hud'
const canvas = () => document.querySelector('.app canvas')

/** Picks the screen for the current phase; the loading veil sits over play until the world is ready. */
export function Overlay() {
  const phase = useGameStore(s => s.phase)
  const endingCard = useGameStore(s => s.endingCard)
  const contextLost = useGameStore(s => s.contextLost)
  if (phase === 'title') return <TitleScreen/>
  return <>
    {contextLost ? <ContextLostScreen/> : endingCard ? <EndingCard/> : phase === 'paused' ? <PauseScreen/> : <Hud/>}
    <LoadingVeil/>
  </>
}

function ContextLostScreen() {
  return <div className="screen pause-screen" role="alertdialog" aria-modal="true" aria-label="画面暂时失去连接">
    <div className="panel centred">
      <div className="eyebrow"><Leaf/>WEBGL CONTEXT LOST</div>
      <h1 className="logo">画面暂时失去连接</h1>
      <p className="description">请稍等，或刷新页面重试。</p>
      <div className="actions"><button className="primary" onClick={() => window.location.reload()}>刷新页面</button></div>
    </div>
  </div>
}

function PauseScreen() {
  const resume = useGameStore(s => s.resume)
  const title = useGameStore(s => s.title)
  const resumeAndLook = () => { soundscape.start(); resume(); requestLock(canvas()) }
  const backToTitle = () => { flushLiveSave(route); title() }
  return <div className="screen pause-screen" role="dialog" aria-modal="true" aria-label="稍作停留">
    <div className="panel">
      <div className="eyebrow"><Leaf/>THE FOREST WAITS</div>
      <h1 className="logo">稍作停留</h1>
      <p className="tagline">森林会在这里等你。</p>
      <p className="description">继续后将自动捕获鼠标；若浏览器拒绝，请再点击画面。</p>
      <div className="actions">
        <button className="primary" onClick={resumeAndLook} autoFocus><Leaf/>继续探索<span className="arrow">→</span></button>
        <button className="secondary" onClick={backToTitle}>返回标题</button>
      </div>
      <Settings/><Controls/>
    </div>
  </div>
}

function EndingCard() {
  const setEndingCard = useGameStore(s => s.setEndingCard)
  const resume = useGameStore(s => s.resume)
  const title = useGameStore(s => s.title)
  const seeds = useGameStore(s => s.seeds)
  const close = () => { soundscape.start(); setEndingCard(false); resume(); requestLock(canvas()) }
  const backToTitle = () => { flushLiveSave(route); title() }
  const missingSunSeed = !route.seedsAt.has(8)
  return <div className="screen ending-screen" role="dialog" aria-modal="true" aria-label="森林被点亮了">
    <Motes count={40} seed={31}/>
    <div className="panel centred">
      <div className="eyebrow"><Leaf/>THE FOREST REMEMBERS<Leaf className="flip"/></div>
      <h1 className="logo">森林被点亮了</h1>
      <p className="logo-en">Lumenwood <em>Whispers of Light</em></p>
      <p className="description">你唤醒的每一朵花、点亮的每一盏灯，都汇进了古树的光里。森林会记住这一夜。</p>
      {seeds.total > 0 && <p className="description seeds-line">{seeds.found === seeds.total ? '每一颗光之种子都回到了森林。' : `找到光之种子 ${seeds.found} / ${seeds.total}。还有一些藏在溪谷、幽谷、湖心、崖边、东谷、南湾、北崖${missingSunSeed ? '与营地日光镜对岸' : ''}。`}</p>}
      <div className="actions">
        <button className="primary" onClick={close} autoFocus><Leaf/>继续探索<span className="arrow">→</span></button>
        <button className="secondary" onClick={backToTitle}>返回标题</button>
      </div>
    </div>
  </div>
}
