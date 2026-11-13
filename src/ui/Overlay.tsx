import { useGameStore } from '../state/gameStore'
import { requestLock } from '../game/input/focus'
import { soundscape } from '../game/audio/engine'
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
  if (phase === 'title') return <TitleScreen/>
  return <>
    {endingCard ? <EndingCard/> : phase === 'paused' ? <PauseScreen/> : <Hud/>}
    <LoadingVeil/>
  </>
}

function PauseScreen() {
  const { resume, title } = useGameStore()
  const resumeAndLook = () => { soundscape.start(); resume(); requestLock(canvas()) }
  return <div className="screen pause-screen">
    <div className="panel">
      <div className="eyebrow"><Leaf/>THE FOREST WAITS</div>
      <h1 className="logo">稍作停留</h1>
      <p className="tagline">森林会在这里等你。</p>
      <p className="description">继续后将自动捕获鼠标；若浏览器拒绝，请再点击画面。</p>
      <div className="actions">
        <button className="primary" onClick={resumeAndLook}><Leaf/>继续探索<span className="arrow">→</span></button>
        <button className="secondary" onClick={title}>返回标题</button>
      </div>
      <Settings/><Controls/>
    </div>
  </div>
}

function EndingCard() {
  const setEndingCard = useGameStore(s => s.setEndingCard)
  const seeds = useGameStore(s => s.seeds)
  const close = () => { setEndingCard(false); requestLock(canvas()) }
  return <div className="screen ending-screen">
    <Motes count={40} seed={31}/>
    <div className="panel centred">
      <div className="eyebrow"><Leaf/>THE FOREST REMEMBERS<Leaf className="flip"/></div>
      <h1 className="logo">森林被点亮了</h1>
      <p className="logo-en">Lumenwood <em>Whispers of Light</em></p>
      <p className="description">你唤醒的每一朵花、点亮的每一盏灯，都汇进了古树的光里。森林会记住这一夜。</p>
      {seeds.total > 0 && <p className="description seeds-line">{seeds.found === seeds.total ? `十二颗光之种子都回到了森林。` : `找到光之种子 ${seeds.found} / ${seeds.total}。还有一些藏在溪谷、幽谷、湖心与崖边。`}</p>}
      <div className="actions"><button className="primary" onClick={close}><Leaf/>继续探索<span className="arrow">→</span></button></div>
    </div>
  </div>
}
