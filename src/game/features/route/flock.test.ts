import { describe, expect, it } from 'vitest'
import { Flock, MAX_MOTES } from './flock'
const run = (f: Flock, seconds: number, player = { x: 0, z: 0 }) => { for (let t = 0; t < seconds; t += 1 / 60) f.update(1 / 60, player, t) }
describe('guide firefly flock', () => {
  it('followers gather around the player and stay close', () => {
    const f = new Flock()
    f.spawn(5, 0.5, 5); f.spawn(-4, 0.5, 2)
    run(f, 4, { x: 1, z: 1 })
    for (const m of f.motes) { expect(Math.hypot(m.x - 1, m.z - 1)).toBeLessThan(1.6); expect(m.y).toBeGreaterThan(0.8) }
  })
  it('sent motes fly to the target and are absorbed; the rest keep following', () => {
    const f = new Flock()
    for (let i = 0; i < 3; i++) f.spawn(0, 1, 0)
    expect(f.send(2, [6, 1.3, 0])).toBe(2)
    expect(f.following).toBe(1)
    run(f, 4)
    expect(f.motes.length).toBe(1)
    expect(f.send(5, [0, 1, 6])).toBe(1) // only what is following can be sent
  })
  it('caps the number of motes', () => {
    const f = new Flock()
    for (let i = 0; i < MAX_MOTES + 5; i++) f.spawn(0, 0, 0)
    expect(f.motes.length).toBe(MAX_MOTES)
  })
})
