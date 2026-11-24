import { useGameStore } from '../state/gameStore'

export function Objective() {
  const objective = useGameStore(s => s.objective)
  if (!objective) return null
  return <section className="objective" aria-label="当前目标">
    <div key={objective.id} className="objective-copy" aria-live="polite">
      <div className="objective-progress">{objective.progress}</div>
      <div className="objective-title">{objective.title}</div>
      <div className="objective-detail">{objective.detail}</div>
    </div>
    {objective.distance !== null && <div className="objective-bearing">
      <span className="objective-compass" aria-hidden="true"><svg viewBox="0 0 32 32" style={{ transform: `rotate(${objective.angle}deg)` }}><path d="M16 4 25 25 16 20 7 25Z"/></svg></span>
      <span>{objective.direction}<strong>{objective.distance} 米<span> · {objective.actionHint ?? (objective.id.startsWith('flower') || objective.id.startsWith('lantern') ? '靠近即可互动' : '沿林径前行')}</span></strong></span>
    </div>}
    {objective.alternateHint && <div className="objective-alternate">{objective.alternateHint}</div>}
  </section>
}
