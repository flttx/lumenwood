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
