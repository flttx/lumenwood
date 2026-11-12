import { describe, expect, it } from 'vitest'
import { SAFE, STARTLE, createRabbit, rabbitPose, stepRabbit } from './rabbits'
import { random } from '../../shared/random'

const open = () => true
const run = (seconds: number, step: (dt: number) => void) => { for (let t = 0; t < seconds; t += 1 / 60) step(1 / 60) }

describe('rabbits', () => {
  it('stays near home while the player is far away', () => {
    const rand = random(1), r = createRabbit({ x: 0, z: 0 }, rand)
    let hops = 0
    run(60, dt => { const before = r.state; stepRabbit(r, dt, { x: 100, z: 100 }, open, rand); if (before === 'idle' && r.state === 'hop') hops++ })
    expect(hops).toBeGreaterThan(3)
    expect(Math.hypot(r.x, r.z)).toBeLessThan(6)
  })
  it('bolts away from a close player and calms down at a safe distance', () => {
    const rand = random(2), r = createRabbit({ x: 0, z: 0 }, rand), player = { x: STARTLE - 1, z: 0 }
    stepRabbit(r, 1 / 60, player, open, rand)
    expect(r.fleeing).toBe(true)
    run(8, dt => stepRabbit(r, dt, player, open, rand))
    expect(r.x).toBeLessThan(-(SAFE - STARTLE))
    expect(r.fleeing).toBe(false)
  })
  it('never hops onto blocked ground', () => {
    const rand = random(3), r = createRabbit({ x: 0, z: 0 }, rand), wall = (x: number) => x < 0.5
    run(30, dt => { stepRabbit(r, dt, { x: -2, z: 0 }, wall, rand); expect(wall(r.to.x)).toBe(true) })
  })
  it('arcs up during a hop and rests on the ground when idle', () => {
    const rand = random(4), r = createRabbit({ x: 0, z: 0 }, rand)
    expect(rabbitPose(r, 0).lift).toBe(0)
    stepRabbit(r, 1 / 60, { x: 1, z: 0 }, open, rand)
    run(0.1, dt => stepRabbit(r, dt, { x: 1, z: 0 }, open, rand))
    expect(r.state).toBe('hop')
    expect(rabbitPose(r, 0).lift).toBeGreaterThan(0)
  })
})
