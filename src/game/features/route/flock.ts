import { dampFactor } from '../../player/movement'
// Guide fireflies: a handful of motes simulated on the CPU (at most a dozen or so, so this is cheap). Each follows the
// player in a loose orbit until it is sent to a lantern, then flies there and is absorbed.
export const MAX_MOTES = 24
const ORBIT_RADIUS = 0.85, ORBIT_HEIGHT = 1.35, FOLLOW_RATE = 2.6, DELIVER_RATE = 2.2, ARRIVE = 0.12
export interface Mote { x: number; y: number; z: number; seed: number; target: [number, number, number] | null }

export class Flock {
  readonly motes: Mote[] = []
  private seeds = 0
  /** A new follower appears at (x, y, z), e.g. above the flower that released it. */
  spawn(x: number, y: number, z: number) {
    if (this.motes.length < MAX_MOTES) this.motes.push({ x, y, z, seed: (this.seeds++ * 0.618034) % 1, target: null })
  }
  /** Sends up to `count` following motes to `target`; returns how many went. */
  send(count: number, target: [number, number, number]) {
    let sent = 0
    for (const m of this.motes) if (sent < count && !m.target) { m.target = target; sent++ }
    return sent
  }
  get following() { return this.motes.reduce((n, m) => n + (m.target ? 0 : 1), 0) }
  /** Advances every mote; `time` drives the orbit so followers circle the player. */
  update(dt: number, player: { x: number; z: number }, time: number) {
    const follow = dampFactor(FOLLOW_RATE, dt), deliver = dampFactor(DELIVER_RATE, dt)
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i]
      if (m.target) {
        const [tx, ty, tz] = m.target, dx = tx - m.x, dy = ty - m.y, dz = tz - m.z
        // Rise a little on the way so the flight reads as an arc rather than a slide.
        m.x += dx * deliver; m.z += dz * deliver; m.y += dy * deliver + Math.min(1, Math.hypot(dx, dz)) * 0.6 * dt
        if (Math.hypot(dx, dy, dz) < ARRIVE) this.motes.splice(i, 1)
        continue
      }
      const angle = time * 0.9 + m.seed * Math.PI * 2, r = ORBIT_RADIUS + 0.15 * Math.sin(time * 1.3 + m.seed * 9)
      const tx = player.x + Math.cos(angle) * r, tz = player.z + Math.sin(angle) * r, ty = ORBIT_HEIGHT + 0.25 * Math.sin(time * 1.7 + m.seed * 13)
      m.x += (tx - m.x) * follow; m.y += (ty - m.y) * follow; m.z += (tz - m.z) * follow
    }
  }
}
/** The session's flock, fed by flowers and spent by lanterns. */
export const flock = new Flock()
