// Light springy hop physics (`Space`): vertical-only expressive motion with jump buffering and squash-stretch feedback.
// Pure helpers over plain frame-loop state (unit-tested); horizontal bounds/colliders remain strictly enforced by Player.
export const HOP_IMPULSE = 5.4
export const HOP_GRAVITY = 15.8
export const HOP_BUFFER = 0.12

export interface HopState {
  offset: number
  vy: number
  grounded: boolean
  buffer: number
  /** Positive on takeoff stretch, negative on landing squash; decays back to 0. */
  squash: number
}

export function createHopState(): HopState {
  return { offset: 0, vy: 0, grounded: true, buffer: 0, squash: 0 }
}

/** Shared frame-loop hop state read by Character for subtle squash-and-stretch and Player for vertical offset. */
export const hopState: HopState = createHopState()

export function resetHop(s: HopState = hopState) {
  s.offset = 0; s.vy = 0; s.grounded = true; s.buffer = 0; s.squash = 0
}

/** Requests a hop (buffered briefly so pressing Space just before landing still feels responsive). */
export function requestHop(s: HopState) {
  s.buffer = HOP_BUFFER
}

/** Advances hop kinematics by `dt` s. Returns `'takeoff' | 'land' | null` for audio/camera feedback. */
export function stepHop(s: HopState, dt: number): 'takeoff' | 'land' | null {
  const step = Math.min(Math.max(dt, 0), 0.05)
  let event: 'takeoff' | 'land' | null = null
  if (s.buffer > 0) s.buffer = Math.max(0, s.buffer - step)
  if (s.grounded && s.buffer > 0) {
    s.grounded = false
    s.vy = HOP_IMPULSE
    s.buffer = 0
    s.squash = 1
    event = 'takeoff'
  }
  if (!s.grounded) {
    s.offset += s.vy * step
    s.vy -= HOP_GRAVITY * step
    if (s.offset <= 0) {
      s.offset = 0
      s.vy = 0
      s.grounded = true
      s.squash = -1
      event = 'land'
    }
  }
  if (Math.abs(s.squash) > 0.001) {
    s.squash *= Math.exp(-11 * step)
    if (Math.abs(s.squash) <= 0.001) s.squash = 0
  }
  return event
}
