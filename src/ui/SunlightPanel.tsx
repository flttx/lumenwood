import { useGameStore } from '../state/gameStore'
export function SunlightPanel() {
  const sunlight = useGameStore(s => s.sunlight)
  if (!sunlight) return null
  return <section className="sunlight-panel" aria-label="日光镜互动">
    <div className="sunlight-label">
      <span>借光生长</span>
      <small>林间光路</small>
    </div>
    {sunlight.index >= 0 && <div className="sunlight-controls">
      <span className="sunlight-dial" aria-hidden="true">
        <svg viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="11.5" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2"/>
          <g style={{ transform: `rotate(${sunlight.heading}deg)`, transformOrigin: '14px 14px' }}>
            <line x1="14" y1="14" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="2.2" fill="currentColor"/>
          </g>
        </svg>
      </span>
      <strong className="sunlight-name">日光镜 {sunlight.index + 1}</strong>
      <span className="sunlight-angle">{sunlight.heading}°</span>
      {sunlight.daylight && <span className="sunlight-keys"><kbd>Q</kbd>顺时针 <kbd>E</kbd>逆时针</span>}
    </div>}
    <div className="sunlight-status">{sunlight.status}</div>
    {sunlight.growth > 0 && !sunlight.grown && <div className="sunlight-progress">
      <progress aria-label="藤桥生长" max={100} value={sunlight.growth}/>
      <small>{Math.round(sunlight.growth)}%</small>
    </div>}
  </section>
}
