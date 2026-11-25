import { describe, expect, it } from 'vitest'
import { createHopState, HOP_IMPULSE, requestHop, resetHop, stepHop } from './hop'

describe('player hop kinematics', () => {
  it('takes off on request, arcs cleanly above ground, and lands back at offset 0', () => {
    const s = createHopState()
    expect(stepHop(s, 0.016)).toBeNull()
    expect(s.offset).toBe(0)
    expect(s.grounded).toBe(true)

    requestHop(s)
    expect(stepHop(s, 0.016)).toBe('takeoff')
    expect(s.grounded).toBe(false)
    expect(s.offset).toBeGreaterThan(0)
    expect(s.squash).toBeGreaterThan(0)

    let peak = s.offset
    let landed = false
    for (let i = 0; i < 80; i++) {
      const ev = stepHop(s, 0.016)
      if (s.offset > peak) peak = s.offset
      if (ev === 'land') { landed = true; break }
    }
    expect(peak).toBeGreaterThan(0.75)
    expect(peak).toBeLessThan(1.1)
    expect(landed).toBe(true)
    expect(s.grounded).toBe(true)
    expect(s.offset).toBe(0)
    expect(s.squash).toBeLessThan(0)
  })

  it('buffers a Space press shortly before landing into an immediate follow-up hop', () => {
    const s = createHopState()
    s.grounded = false
    s.offset = 0.05
    s.vy = -HOP_IMPULSE * 0.8
    requestHop(s)
    expect(stepHop(s, 0.02)).toBe('land')
    expect(stepHop(s, 0.016)).toBe('takeoff')
    resetHop(s)
    expect(s).toEqual({ offset: 0, vy: 0, grounded: true, buffer: 0, squash: 0 })
  })
})
