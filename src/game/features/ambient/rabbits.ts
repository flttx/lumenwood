// Rabbit behaviour (CRT-001, scene enrichment 2026-11-12): pure state, stepped by the frame loop. A rabbit nibbles in
// place, now and then hops a few times around its home; when the player comes close it bolts away in quick, high hops
// and settles again once at a safe distance. The model is static: hops, squash and the nibbling bob are code motion.
export interface Spot { x: number; z: number }
export interface Rabbit {
  home: Spot; x: number; z: number; heading: number
  state: 'idle' | 'hop'; fleeing: boolean; t: number; wait: number; hopsLeft: number
  from: Spot; to: Spot; hopTime: number; hopHeight: number
}
/** Player distance that startles a rabbit, the distance at which it calms down, and hop sizes. */
export const STARTLE = 4.5, SAFE = 10, CALM_HOP = 0.55, FLEE_HOP = 1.25
const CALM_TIME = 0.42, FLEE_TIME = 0.32, ROAM = 3.5

export function createRabbit(home: Spot, rand: () => number): Rabbit {
  return { home, x: home.x, z: home.z, heading: rand() * Math.PI * 2, state: 'idle', fleeing: false, t: 0, wait: 1 + rand() * 4, hopsLeft: 0,
    from: { ...home }, to: { ...home }, hopTime: CALM_TIME, hopHeight: 0 }
}

function startHop(r: Rabbit, dirX: number, dirZ: number, flee: boolean, open: (x: number, z: number) => boolean, rand: () => number) {
  const length = flee ? FLEE_HOP : CALM_HOP
  // Try the wanted direction first, then fan out to either side until there is open ground.
  for (let i = 0; i < 7; i++) {
    const turn = (i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? 1 : -1)) * 0.5 + (rand() - 0.5) * 0.3
    const a = Math.atan2(dirX, dirZ) + turn, x = r.x + Math.sin(a) * length, z = r.z + Math.cos(a) * length
    if (!open(x, z)) continue
    r.state = 'hop'; r.t = 0; r.from = { x: r.x, z: r.z }; r.to = { x, z }; r.heading = a
    r.hopTime = flee ? FLEE_TIME : CALM_TIME; r.hopHeight = flee ? 0.32 : 0.16
    return true
  }
  return false
}

/** Advances one rabbit by `dt`; `open` says whether a spot is free ground (no trunk, water or structure). */
export function stepRabbit(r: Rabbit, dt: number, player: Spot, open: (x: number, z: number) => boolean, rand: () => number) {
  const away = Math.hypot(r.x - player.x, r.z - player.z)
  // Startled: bolt at once (an idle rabbit drops whatever wait it had left).
  if (!r.fleeing && away < STARTLE) { r.fleeing = true; r.hopsLeft = 0; if (r.state === 'idle') r.wait = 0 }
  if (r.fleeing && away > SAFE) { r.fleeing = false; r.hopsLeft = 0 }
  r.t += dt
  if (r.state === 'hop') {
    const k = Math.min(1, r.t / r.hopTime)
    r.x = r.from.x + (r.to.x - r.from.x) * k; r.z = r.from.z + (r.to.z - r.from.z) * k
    if (k < 1) return
    r.state = 'idle'; r.t = 0
    r.wait = r.fleeing ? 0.05 : r.hopsLeft > 0 ? 0.15 + rand() * 0.2 : 1.5 + rand() * 4.5
  }
  if (r.t < r.wait) return
  if (r.fleeing) {
    const d = away || 1
    if (!startHop(r, (r.x - player.x) / d, (r.z - player.z) / d, true, open, rand)) r.t = 0
    return
  }
  if (r.hopsLeft === 0) r.hopsLeft = 1 + Math.floor(rand() * 3)
  // Wander toward a random point near home, drifting back when it has strayed (e.g. after fleeing).
  const tx = r.home.x + (rand() - 0.5) * 2 * ROAM - r.x, tz = r.home.z + (rand() - 0.5) * 2 * ROAM - r.z
  if (startHop(r, tx, tz, false, open, rand)) r.hopsLeft--
  else { r.hopsLeft = 0; r.t = 0 }
}

/** Height above the ground and body squash for the current pose: up on the hop arc, a slight crouch on landing. */
export function rabbitPose(r: Rabbit, time: number) {
  if (r.state === 'hop') {
    const k = Math.min(1, r.t / r.hopTime)
    return { lift: 4 * r.hopHeight * k * (1 - k), stretch: 1 + 0.18 * Math.sin(k * Math.PI), pitch: -0.35 * Math.cos(k * Math.PI) }
  }
  // Idle: nibbling dips the head now and then.
  const nibble = Math.max(0, Math.sin(time * 5 + r.home.x)) * (Math.sin(time * 0.7 + r.home.z) > 0.3 ? 1 : 0)
  return { lift: 0, stretch: 1, pitch: 0.12 * nibble }
}
