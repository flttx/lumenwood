// Core active verb: hand-lantern resonance pulse and luminous flow momentum.
// Pure rules and frame-loop-owned state (unit-tested); ResonanceDirector handles input, world echoes, and rendering.

export const PULSE_COOLDOWN = 1.6
export const PULSE_SPEED = 28
export const FLOW_MAX_COMBO = 5

/** Outer detection radius (m) of a lantern pulse; grows with collected Light Seeds (26 m → 56 m). */
export const pulseReach = (seedsFound: number) => 26 + 2.5 * Math.min(12, Math.max(0, seedsFound))

/** Distance (m) within which a lantern pulse remotely awakens an unharvested route flower (boosted +50% on water). */
export const wakeReach = (seedsFound: number, onWater = false) =>
  (4.2 + 0.35 * Math.min(12, Math.max(0, seedsFound))) * (onWater ? 1.5 : 1)

/** Seconds luminous flow holds before gently decaying; grows with Light Seeds (3.2 s → 5.0 s). */
export const flowDuration = (seedsFound: number) => 3.2 + 0.15 * Math.min(12, Math.max(0, seedsFound))

/** Movement speed multiplier from active luminous flow. Strictly 1.0 when idle so base walk/run speeds never drift. */
export function flowSpeedMultiplier(flow: number, combo: number) {
  if (flow <= 0.001) return 1
  const clamped = Math.min(1, flow)
  return 1 + 0.12 * clamped + 0.012 * Math.min(FLOW_MAX_COMBO, Math.max(0, combo)) * clamped
}

export interface ResonanceState {
  pulseAt: number
  pulseOrigin: [number, number, number]
  pulseMaxRadius: number
  pulseOnWater: boolean
  lanternFlare: number
  hearthFlare: number
  flow: number
  flowUntil: number
  combo: number
  /** Route flower indices remotely awakened by a lantern pulse wave; consumed by GlowFlowers. */
  remoteWake: Set<number>
}

export function createResonanceState(): ResonanceState {
  return {
    pulseAt: -Infinity,
    pulseOrigin: [0, 0, 0],
    pulseMaxRadius: 26,
    pulseOnWater: false,
    lanternFlare: 0,
    hearthFlare: 0,
    flow: 0,
    flowUntil: -Infinity,
    combo: 0,
    remoteWake: new Set(),
  }
}

/** Shared frame-loop resonance state (never React state). */
export const resonance: ResonanceState = createResonanceState()

export function resetResonance() {
  resonance.pulseAt = -Infinity
  resonance.pulseOrigin = [0, 0, 0]
  resonance.pulseMaxRadius = 26
  resonance.pulseOnWater = false
  resonance.lanternFlare = 0
  resonance.hearthFlare = 0
  resonance.flow = 0
  resonance.flowUntil = -Infinity
  resonance.combo = 0
  resonance.remoteWake.clear()
}

/** Fires a lantern pulse if off cooldown; returns true when emitted. */
export function triggerPulse(
  state: ResonanceState,
  x: number,
  y: number,
  z: number,
  now: number,
  seedsFound: number,
  onWater = false,
) {
  if (now - state.pulseAt < PULSE_COOLDOWN - 1e-6) return false
  state.pulseAt = now
  state.pulseOrigin = [x, y, z]
  state.pulseMaxRadius = pulseReach(seedsFound)
  state.pulseOnWater = onWater
  state.lanternFlare = 1
  return true
}

/** Current expanding pulse radius (m), or -1 once the wave has finished fading past max radius. */
export function pulseRadiusAt(state: ResonanceState, now: number) {
  const age = now - state.pulseAt
  if (age < 0) return -1
  const radius = age * PULSE_SPEED
  return radius <= state.pulseMaxRadius ? radius : -1
}

/** Grants luminous flow and increments chain combo on meaningful interactions (flower, lantern, seed, secret). */
export function boostFlow(state: ResonanceState, now: number, seedsFound: number, steps = 1) {
  state.flow = 1
  state.combo = Math.min(FLOW_MAX_COMBO, state.combo + steps)
  state.flowUntil = Math.max(state.flowUntil, now + flowDuration(seedsFound))
}

/** Gently holds luminous flow while gliding along a firefly stream or crossing a glowing/vine/stone bridge. */
export function sustainFlow(state: ResonanceState, now: number, floor = 0.65) {
  if (state.flow < floor) state.flow = floor
  state.flowUntil = Math.max(state.flowUntil, now + 0.45)
}

/** Advances flare and flow decay once per frame during active play. */
export function advanceResonance(state: ResonanceState, dt: number, now: number) {
  const step = Math.min(Math.max(dt, 0), 0.1)
  if (state.lanternFlare > 0) state.lanternFlare = Math.max(0, state.lanternFlare - step * 1.45)
  if (state.hearthFlare > 0) state.hearthFlare = Math.max(0, state.hearthFlare - step * 0.9)
  if (now > state.flowUntil && state.flow > 0) {
    state.flow = Math.max(0, state.flow - step * 0.72)
    if (state.flow < 0.05) { state.flow = 0; state.combo = 0 }
  }
}
