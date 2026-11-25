import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { random } from '../game/shared/random'
// Small decorative pieces shared by the screens: the leaf mark from the concept boards, a lantern glyph for the HUD
// tally, and drifting firefly motes drawn with CSS only (no per-frame React work).

export function Leaf({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="M20 3C10 3 4 8.5 4 15.5c0 1.6.4 3 1 4.2C7 13 11 9.6 16 7.5c-4.3 2.8-7.6 6.6-9.6 11.9C7.6 20.4 9 21 11 21c6.6 0 10-6.6 9-18z" fill="currentColor"/></svg>
}

export function LanternGlyph({ lit }: { lit: boolean }) {
  return <svg className={lit ? 'lantern-glyph lit' : 'lantern-glyph'} viewBox="0 0 16 24" aria-hidden="true">
    <circle cx="8" cy="3" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M3.5 7.5h9l-1 2h-7z M4.5 9.5h7v10h-7z M3.5 19.5h9v2h-9z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    <ellipse className="flame" cx="8" cy="14.5" rx="2" ry="3.2"/>
  </svg>
}

export function SeedGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5C11.2 4.3 12.6 7.5 12 10.6 11.4 13.1 9.8 14.5 8 14.5S4.6 13.1 4 10.6C3.4 7.5 4.8 4.3 8 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8" cy="9.2" r="2" fill="currentColor"/>
  </svg>
}

export function SparkGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5 9.6 6.4 14.5 8 9.6 9.6 8 14.5 6.4 9.6 1.5 8 6.4 6.4Z" fill="currentColor"/>
  </svg>
}

export function VolumeGlyph({ muted, className }: { muted?: boolean; className?: string }) {
  return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M2.5 7h3.2L9.8 3.6v10.8L5.7 11H2.5z" fill="currentColor"/>
    {muted
      ? <path d="M12.2 6.8 15.8 10.4M15.8 6.8 12.2 10.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      : <path d="M12.2 6.2a3.8 3.8 0 0 1 0 5.6M14.2 4.3a6.4 6.4 0 0 1 0 9.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>}
  </svg>
}

export function PauseGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
    <rect x="3.5" y="3" width="3" height="10" rx="1" fill="currentColor"/>
    <rect x="9.5" y="3" width="3" height="10" rx="1" fill="currentColor"/>
  </svg>
}

export function EyeGlyph({ hidden, className }: { hidden?: boolean; className?: string }) {
  return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M1.8 9s2.7-4.6 7.2-4.6S16.2 9 16.2 9s-2.7 4.6-7.2 4.6S1.8 9 1.8 9Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="9" cy="9" r="2.2" fill="currentColor"/>
    {hidden && <path d="M3 15 15 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>}
  </svg>
}

export function GearGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="9" cy="9" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M9 2.2v1.6M9 14.2v1.6M2.2 9h1.6M14.2 9h1.6M4.2 4.2l1.1 1.1M12.7 12.7l1.1 1.1M13.8 4.2l-1.1 1.1M5.3 12.7l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
}

export function JournalGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M3 4.2A1.7 1.7 0 0 1 4.7 2.5H9v12.8H4.7A1.7 1.7 0 0 0 3 16.5Z M15 4.2a1.7 1.7 0 0 0-1.7-1.7H9v12.8h4.3a1.7 1.7 0 0 1 1.7 1.2Z" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/>
  </svg>
}

export function CameraGlyph({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M2.6 6.2a1.6 1.6 0 0 1 1.6-1.6h1.6l1.1-1.6h4.2l1.1 1.6h1.6a1.6 1.6 0 0 1 1.6 1.6v7a1.6 1.6 0 0 1-1.6 1.6H4.2a1.6 1.6 0 0 1-1.6-1.6Z" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"/>
    <circle cx="9" cy="9.6" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.35"/>
  </svg>
}

export function TimeGlyph({ mode, className }: { mode: 'journey' | 'day' | 'twilight' | 'night'; className?: string }) {
  if (mode === 'night') {
    return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M12.9 11.4A5.2 5.2 0 0 1 6.6 5.1a5.4 5.4 0 1 0 6.3 6.3Z" fill="currentColor"/>
    </svg>
  }
  if (mode === 'twilight') {
    return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 12.2h12M5 12.2a4 4 0 0 1 8 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9 4.5v2M4.8 6.8l1.2 1.2M13.2 6.8 12 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  }
  if (mode === 'day') {
    return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="3" fill="currentColor"/>
      <path d="M9 2.4v1.8M9 13.8v1.8M2.4 9h1.8M13.8 9h1.8M4.3 4.3l1.3 1.3M12.4 12.4l1.3 1.3M13.7 4.3l-1.3 1.3M5.6 12.4l-1.3 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  }
  return <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.35"/>
    <path d="M9 3.4a5.6 5.6 0 0 1 0 11.2Z" fill="currentColor"/>
  </svg>
}

/** Firefly motes drifting over a screen; positions and timings are seeded, so they do not jump between renders. */
export function Motes({ count = 28, seed = 7 }: { count?: number; seed?: number }) {
  const motes = useMemo(() => {
    const rand = random(seed)
    return Array.from({ length: count }, () => ({
      '--x': `${(rand() * 100).toFixed(1)}%`, '--y': `${(30 + rand() * 70).toFixed(1)}%`,
      '--size': `${(2 + rand() * 3.5).toFixed(1)}px`, '--delay': `${(-rand() * 14).toFixed(1)}s`,
      '--dur': `${(9 + rand() * 9).toFixed(1)}s`, '--dx': `${((rand() - 0.5) * 120).toFixed(0)}px`,
    }) as CSSProperties)
  }, [count, seed])
  return <div className="motes" aria-hidden="true">{motes.map((style, i) => <span key={i} style={style}/>)}</div>
}
