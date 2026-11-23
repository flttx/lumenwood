import { describe, expect, it } from 'vitest'
import { createProgress } from '../route/progress'
import { createSecretState } from './secrets'
import { sideObjective } from './objective'
import { fordStones, giantMushrooms, seeds } from '../../world/zones/sideLayout'

describe('contextual side-area guidance', () => {
  it('keeps the echo rule visible without revealing its answer and leaves the main route one key away', () => {
    const s = createSecretState(); s.echo = [1]
    const o = sideObjective(createProgress(), -110, 8, s)!
    expect(o.progress).toContain('1/3'); expect(o.target).toBeNull(); expect(o.alternateHint).toContain('T')
    expect(o.detail).toContain('倾听')
  })
  it('uses live mushroom/ford progress and replaces a solved task with its seed reward', () => {
    const p = createProgress(), s = createSecretState(); s.mushrooms.add(0)
    const hollow = sideObjective(p, 80, -16, s)!
    expect(hollow.target).not.toMatchObject(giantMushrooms[0]); expect(hollow.progress).toContain('1/7')
    s.ford = 2; expect(sideObjective(p, -84, 122, s)?.target).toEqual(fordStones[2])
    p.secretsAt.set('lake', 0)
    const reward = seeds.find(s => s.secret === 'lake')!
    expect(sideObjective(p, -84, 122, s)?.target).toEqual(reward)
    p.seedsAt.set(seeds.indexOf(reward), 1)
    expect(sideObjective(p, -84, 122, s)?.target).toBeNull()
  })
  it('leaves main-region objectives alone', () => {
    expect(sideObjective(createProgress(), 0, 0, createSecretState())).toBeNull()
  })
})
