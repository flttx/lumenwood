import { useGameStore } from '../state/gameStore'
export function SunlightPanel() {
  const sunlight = useGameStore(s => s.sunlight)
  if (!sunlight) return null
  return <section className="sunlight-panel" aria-label="日光镜互动">
    <div className="sunlight-label">借光生长 <small>玩法样板 · 临时美术</small></div>
    {sunlight.index >= 0 && <div className="sunlight-controls">日光镜 {sunlight.index + 1} <span>{sunlight.heading}°</span>{sunlight.daylight && <><kbd>Q</kbd>顺时针 <kbd>E</kbd>逆时针</>}</div>}
    <div>{sunlight.status}</div>
    {sunlight.growth > 0 && !sunlight.grown && <progress aria-label="藤桥生长" max={100} value={sunlight.growth}/>}
  </section>
}
