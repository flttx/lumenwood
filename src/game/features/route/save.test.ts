import { describe, expect, it } from 'vitest'
import { RESTORED_AGE, parseSave, restore, serialize } from './save'
import { createProgress, gateOpen, releaseFirefly, resetProgress, tryLight } from './progress'
import { LANTERN_COST, lanterns, zoneLanterns } from './routeLayout'
import { glowFlowers } from '../../world/zones/campLayout'

describe('save', () => {
  it('round-trips progress; restored events are long past, so gates are open and carried fireflies are recomputed', () => {
    const p = createProgress()
    glowFlowers.forEach((_, i) => releaseFirefly(p, i))
    zoneLanterns('camp').forEach(i => tryLight(p, i, 0, 10))
    releaseFirefly(p, 7) // one wetland flower woken: one firefly still following
    p.captions.add('start')
    const data = parseSave(JSON.stringify(serialize(p, [-3.21, 40.567])))!
    expect(data.position).toEqual([-3.21, 40.57])
    const q = createProgress()
    restore(q, data, 50)
    expect(q.carried).toBe(7 - zoneLanterns('camp').length * LANTERN_COST)
    expect(q.litAt.filter(t => t !== null).length).toBe(3); expect(q.litAt[0]).toBe(50 - RESTORED_AGE)
    expect(gateOpen(q, 'camp', 50)).toBe(true); expect(gateOpen(q, 'wetland', 50)).toBe(false)
    expect(q.captions.has('start')).toBe(true)
  })
  it('rejects malformed saves and saves from another layout', () => {
    expect(parseSave(null)).toBeNull(); expect(parseSave('not json')).toBeNull(); expect(parseSave('{"v":2}')).toBeNull()
    const good = serialize(createProgress(), [0, 0])
    expect(parseSave(JSON.stringify(good))).not.toBeNull()
    expect(parseSave(JSON.stringify({ ...good, lit: good.lit.slice(1) }))).toBeNull() // lantern count changed
    expect(parseSave(JSON.stringify({ ...good, released: [999] }))).toBeNull()
    expect(parseSave(JSON.stringify({ ...good, position: [0, Number.NaN] }))).toBeNull()
    expect(lanterns.length).toBe(good.lit.length)
  })
  it('a new journey resets progress in place', () => {
    const p = createProgress()
    releaseFirefly(p, 0); p.endingSeen = true
    resetProgress(p)
    expect(p.carried).toBe(0); expect(p.released.size).toBe(0); expect(p.endingSeen).toBe(false)
  })
})
