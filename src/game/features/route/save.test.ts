import { describe, expect, it } from 'vitest'
import { RESTORED_AGE, clearSave, flushLiveSave, livePose, parseSave, restore, serialize, writeSave } from './save'
import { createProgress, gateOpen, releaseFirefly, resetProgress, tryLight } from './progress'
import { LANTERN_COST, lanterns, zoneLanterns } from './routeLayout'
import { glowFlowers } from '../../world/zones/campLayout'
import { flowers } from '../../world/zones/floraLayout'
import { regionDistance, walkableRegions } from '../../world/regions'

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
  it('round-trips camera view, clamps out-of-bounds positions into walkable land, and ignores glade flowers in carried count', () => {
    const p = createProgress()
    const gladeIndex = flowers.findIndex(f => f.zone === 'glade')
    expect(gladeIndex).toBeGreaterThanOrEqual(0)
    releaseFirefly(p, 0)
    p.released.add(gladeIndex) // simulate legacy save that recorded a decorative glade flower
    const data = parseSave(JSON.stringify(serialize(p, [999, -999], [1.234, 0.456])))!
    expect(data.view).toEqual([1.234, 0.456])
    expect(regionDistance(data.position[0], data.position[1], walkableRegions(false, false, false))).toBe(0)
    const restored = createProgress()
    restore(restored, data, 10)
    expect(restored.carried).toBe(1)
  })
  it('refuses to overwrite an externally modified save on pagehide flush', () => {
    const store = new Map<string, string>()
    const originalWindow = globalThis.window
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => { store.set(k, v) },
          removeItem: (k: string) => { store.delete(k) },
        },
      },
    })
    try {
      clearSave()
      const p = createProgress()
      livePose.position = [1, 2]
      expect(flushLiveSave(p, true)).toBe(false) // session has not written yet
      expect(writeSave(serialize(p, [1, 2]))).toBe(true)
      expect(flushLiveSave(p, true)).toBe(true) // still matches last write
      // Simulate another tab updating localStorage behind our back.
      store.set('lumenwood-save-v1', '{"v":2,"external":true}')
      expect(flushLiveSave(p, true)).toBe(false)
      expect(store.get('lumenwood-save-v1')).toBe('{"v":2,"external":true}')
    } finally {
      livePose.position = null
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow })
    }
  })
})
