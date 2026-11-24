import { describe, expect, it } from 'vitest'
import { createProgress } from '../route/progress'
import { createSecretState } from './secrets'
import { sideAreaAt, sideObjective } from './objective'
import { echoStones, fordStones, giantMushrooms, reefCairns, seeds, valeStones } from '../../world/zones/sideLayout'
import { GLEN_PASS, HOLLOW_PASS, LAKE_PASS, OVERLOOK_PASS, REEF_CAUSEWAY, STAR_PASS, VALE_PASS } from '../../world/regions'

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
    const rewardGoal = sideObjective(p, -84, 122, s)!
    expect(rewardGoal.id).toBe('side-lake-reward')
    expect(rewardGoal.target).toEqual(reward)
    p.seedsAt.set(seeds.indexOf(reward), 1)
    const afterReward = sideObjective(p, -84, 122, s)!
    expect(afterReward.target).toBeNull()
    expect(afterReward.detail).toContain('1 颗光之种子')
  })
  it('recognizes side passes and keeps echo compass off near the farthest stone', () => {
    expect(sideAreaAt((GLEN_PASS.minX + GLEN_PASS.maxX) / 2, (GLEN_PASS.minZ + GLEN_PASS.maxZ) / 2)).toBe('glen')
    expect(sideAreaAt((HOLLOW_PASS.minX + HOLLOW_PASS.maxX) / 2, (HOLLOW_PASS.minZ + HOLLOW_PASS.maxZ) / 2)).toBe('hollow')
    expect(sideAreaAt((LAKE_PASS.minX + LAKE_PASS.maxX) / 2, (LAKE_PASS.minZ + LAKE_PASS.maxZ) / 2)).toBe('lake')
    expect(sideAreaAt((OVERLOOK_PASS.minX + OVERLOOK_PASS.maxX) / 2, (OVERLOOK_PASS.minZ + OVERLOOK_PASS.maxZ) / 2)).toBe('overlook')
    expect(sideAreaAt((VALE_PASS.minX + VALE_PASS.maxX) / 2, (VALE_PASS.minZ + VALE_PASS.maxZ) / 2)).toBe('vale')
    expect(sideAreaAt((REEF_CAUSEWAY.minX + REEF_CAUSEWAY.maxX) / 2, (REEF_CAUSEWAY.minZ + REEF_CAUSEWAY.maxZ) / 2)).toBe('reef')
    expect(sideAreaAt((STAR_PASS.minX + STAR_PASS.maxX) / 2, (STAR_PASS.minZ + STAR_PASS.maxZ) / 2)).toBe('starcliff')
    const farthestStone = echoStones[1]
    expect(sideObjective(createProgress(), farthestStone.x, farthestStone.z, createSecretState())?.target).toBeNull()
  })
  it('guides Sunstone Vale, Tidewater Reef, and Starlight Terrace accurately', () => {
    const p = createProgress(), s = createSecretState()
    s.valeAt[0] = 5
    const vale = sideObjective(p, 73, 126, s, 6)!
    expect(vale.progress).toContain(`1/${valeStones.length}`)
    expect(vale.target).not.toMatchObject(valeStones[0])
    s.reef.add(0)
    const reef = sideObjective(p, 0, -116, s, 6)!
    expect(reef.progress).toContain(`1/${reefCairns.length}`)
    expect(reef.target).not.toMatchObject(reefCairns[0])
    const star = sideObjective(p, -10, 360, s, 6)!
    expect(star.target).toEqual(seeds[15])
    p.seedsAt.set(15, 10)
    expect(sideObjective(p, -10, 360, s, 11)?.target).toBeNull()
  })
  it('leaves main-region objectives alone', () => {
    expect(sideObjective(createProgress(), 0, 0, createSecretState())).toBeNull()
  })
})
