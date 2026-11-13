import { describe, expect, it } from 'vitest'
import { createProgress } from '../route/progress'
import { collectSeed, createSecretState, memories, seedAvailable, solve, stepFord, touchEcho, wakeMushroom } from './secrets'
import { ECHO_ORDER, fordStones, giantMushrooms, seeds } from '../../world/zones/sideLayout'
import { regionDistance } from '../../world/regions'
import { treeColliders } from '../../world/zones/forestLayout'
import { basinDepth } from '../../world/zones/wetlandLayout'

describe('side-area secrets', () => {
  it('echo stones solve only in the hummed order, and a wrong stone starts over', () => {
    const s = createSecretState()
    expect(touchEcho(s, ECHO_ORDER[1])).toBe('wrong')
    expect(touchEcho(s, ECHO_ORDER[0])).toBe('progress'); expect(touchEcho(s, ECHO_ORDER[0])).toBe('wrong') // repeating the first note keeps it
    expect(touchEcho(s, ECHO_ORDER[1])).toBe('progress'); expect(touchEcho(s, ECHO_ORDER[2])).toBe('solved')
  })
  it('every giant mushroom must wake', () => {
    const s = createSecretState()
    giantMushrooms.forEach((_, i) => expect(wakeMushroom(s, i)).toBe(i === giantMushrooms.length - 1 ? 'solved' : 'woke'))
    expect(wakeMushroom(s, 0)).toBe('none')
  })
  it('the ford must be crossed stone by stone', () => {
    const s = createSecretState()
    expect(stepFord(s, 0)).toBe('progress'); expect(stepFord(s, 2)).toBe('reset'); expect(s.ford).toBe(0)
    for (let i = 0; i < fordStones.length; i++) expect(stepFord(s, i)).toBe(i === fordStones.length - 1 ? 'solved' : 'progress')
  })
  it('secret seeds appear only once solved; each seed tells the next memory once', () => {
    const p = createProgress(), secret = seeds.findIndex(s => s.secret === 'glen'), plain = seeds.findIndex(s => !s.secret)
    expect(seedAvailable(p, secret)).toBe(false); expect(collectSeed(p, secret, 1)).toBeNull()
    expect(collectSeed(p, plain, 1)).toBe(memories[0]); expect(collectSeed(p, plain, 2)).toBeNull()
    expect(solve(p, 'glen', 3)).toBe(true); expect(solve(p, 'glen', 4)).toBe(false)
    expect(collectSeed(p, secret, 5)).toBe(memories[1])
  })
  it('seeds lie on walkable, dry ground clear of trunks', () => {
    expect(seeds.length).toBe(memories.length)
    for (const s of seeds) {
      expect(regionDistance(s.x, s.z)).toBe(0)
      expect(basinDepth(s.x, s.z)).toBeGreaterThan(-0.2) // at most the edge of the shallows
      for (const t of treeColliders) expect(Math.hypot(t.x - s.x, t.z - s.z)).toBeGreaterThan(t.radius + 0.6)
    }
  })
})
