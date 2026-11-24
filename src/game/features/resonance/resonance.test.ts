import { describe, expect, it } from 'vitest'
import {
  FLOW_MAX_COMBO,
  PULSE_COOLDOWN,
  advanceResonance,
  boostFlow,
  createResonanceState,
  flowDuration,
  flowSpeedMultiplier,
  pulseRadiusAt,
  pulseReach,
  resetResonance,
  resonance,
  sustainFlow,
  triggerPulse,
  wakeReach,
} from './resonance'

describe('lantern resonance and luminous flow', () => {
  it('scales pulse reach, remote wake reach, and flow duration with collected light seeds', () => {
    expect(pulseReach(0)).toBe(26)
    expect(pulseReach(12)).toBe(56)
    expect(pulseReach(99)).toBe(56)
    expect(wakeReach(0, false)).toBeCloseTo(4.2)
    expect(wakeReach(12, false)).toBeCloseTo(8.4)
    expect(wakeReach(0, true)).toBeCloseTo(6.3)
    expect(flowDuration(0)).toBeCloseTo(3.2)
    expect(flowDuration(12)).toBeCloseTo(5.0)
  })

  it('enforces pulse cooldown and expands smoothly until reaching max radius', () => {
    const s = createResonanceState()
    expect(pulseRadiusAt(s, 0)).toBe(-1)
    expect(triggerPulse(s, 1, 0, 2, 10, 4, true)).toBe(true)
    expect(s.pulseMaxRadius).toBe(36)
    expect(s.pulseOnWater).toBe(true)
    expect(s.lanternFlare).toBe(1)
    expect(triggerPulse(s, 1, 0, 2, 10 + PULSE_COOLDOWN - 0.1, 4, false)).toBe(false)
    expect(pulseRadiusAt(s, 10.5)).toBeCloseTo(14)
    expect(pulseRadiusAt(s, 15)).toBe(-1)
    expect(triggerPulse(s, 1, 0, 2, 10 + PULSE_COOLDOWN, 4, false)).toBe(true)
  })

  it('keeps base speed untouched at zero flow, boosts smoothly on chains, and decays cleanly', () => {
    expect(flowSpeedMultiplier(0, 0)).toBe(1)
    expect(flowSpeedMultiplier(0, 5)).toBe(1)
    expect(flowSpeedMultiplier(1, 0)).toBeCloseTo(1.12)
    expect(flowSpeedMultiplier(1, FLOW_MAX_COMBO)).toBeCloseTo(1.18)

    const s = createResonanceState()
    for (let i = 0; i < 10; i++) boostFlow(s, 5, 0, 1)
    expect(s.combo).toBe(FLOW_MAX_COMBO)
    expect(s.flow).toBe(1)
    expect(s.flowUntil).toBeCloseTo(8.2)

    // Sustain holds a floor without increasing combo.
    const idle = createResonanceState()
    sustainFlow(idle, 10, 0.55)
    expect(idle.flow).toBeCloseTo(0.55)
    expect(idle.combo).toBe(0)

    // Advancing past flowUntil decays flow back to 0 and clears combo.
    for (let t = 8.3; t < 11; t += 0.1) advanceResonance(s, 0.1, t)
    expect(s.flow).toBe(0)
    expect(s.combo).toBe(0)
    expect(s.lanternFlare).toBe(0)
  })

  it('resets shared resonance singleton cleanly between journeys', () => {
    triggerPulse(resonance, 5, 0, 5, 20, 6, true)
    boostFlow(resonance, 20, 6, 3)
    resonance.remoteWake.add(2)
    resonance.hearthFlare = 0.8
    resetResonance()
    expect(resonance.pulseAt).toBe(-Infinity)
    expect(resonance.flow).toBe(0)
    expect(resonance.combo).toBe(0)
    expect(resonance.lanternFlare).toBe(0)
    expect(resonance.hearthFlare).toBe(0)
    expect(resonance.remoteWake.size).toBe(0)
  })
})
