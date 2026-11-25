import { useGameStore } from '../state/gameStore'

export function Objective() {
  const objective = useGameStore(s => s.objective)
  if (!objective) return null
  const near = objective.distance !== null && objective.distance <= 12
  return <section className={near ? 'objective near' : 'objective'} aria-label="当前目标">
    <div key={objective.id} className="objective-copy" aria-live="polite">
      <div className="objective-progress"><i className="obj-dot" aria-hidden="true"/>{objective.progress}</div>
      <div className="objective-title">{objective.title}</div>
      <div className="objective-detail">{objective.detail}</div>
    </div>
    {objective.distance !== null && <div className="objective-bearing">
      <span className="objective-compass" aria-hidden="true">
        <svg className="compass-ring" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 3"/>
          <circle cx="18" cy="2.2" r="1.2" fill="currentColor" fillOpacity="0.75"/>
        </svg>
        <svg className="compass-needle" viewBox="0 0 32 32" style={{ transform: `rotate(${objective.angle}deg)` }}>
          <path d="M16 4 23.5 24 16 19.4 8.5 24Z"/>
        </svg>
      </span>
      <span className="bearing-meta">{objective.direction}<strong>{objective.distance} 米<span> · {objective.actionHint ?? (objective.id.startsWith('flower') || objective.id.startsWith('lantern') ? '靠近即可互动' : '沿林径前行')}</span></strong></span>
    </div>}
    {objective.alternateHint && <div className="objective-alternate">{objective.alternateHint}</div>}
  </section>
}
