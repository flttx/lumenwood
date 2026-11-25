import { describe, expect, it } from 'vitest'
import { CAMP, GLEN, GLEN_LAKE_TRAIL, HOLLOW, HOLLOW_VALE_TRAIL, NORTH_CORRIDOR, VALE, EAST_RIDGE_TRAIL, WETLAND, BRIDGE } from '../../world/regions'
import { createProgress } from './progress'
import { zoneLanterns } from './routeLayout'
import { lockedGatePrompt } from './gatePrompt'

describe('locked gate unlock prompts', () => {
  it('explains how to unlock the mushroom hollow -> sunstone vale trail before camp lights are done', () => {
    const p = createProgress()
    p.litAt[zoneLanterns('camp')[0]] = 5
    const midX = (HOLLOW_VALE_TRAIL.minX + HOLLOW_VALE_TRAIL.maxX) / 2
    const closed = lockedGatePrompt(p, { north: false, bridge: false, ascent: false }, midX, HOLLOW.maxZ - 2)
    expect(closed).toContain('阳石林谷')
    expect(closed).toContain('1/3')
    expect(lockedGatePrompt(p, { north: true, bridge: false, ascent: false }, midX, HOLLOW.maxZ - 2)).toBeNull()
  })

  it('covers north corridor, west glen-lake loop, wetland light bridge, and east highland ridge', () => {
    const p = createProgress()
    expect(lockedGatePrompt(p, { north: false, bridge: false, ascent: false }, (NORTH_CORRIDOR.minX + NORTH_CORRIDOR.maxX) / 2, CAMP.maxZ - 1)).toContain('0/3')
    expect(lockedGatePrompt(p, { north: false, bridge: false, ascent: false }, (GLEN_LAKE_TRAIL.minX + GLEN_LAKE_TRAIL.maxX) / 2, GLEN.maxZ - 1)).toContain('镜湖')
    expect(lockedGatePrompt(p, { north: true, bridge: false, ascent: false }, (BRIDGE.minX + BRIDGE.maxX) / 2, WETLAND.maxZ - 1)).toContain('萤光湿地')
    expect(lockedGatePrompt(p, { north: true, bridge: true, ascent: false }, (EAST_RIDGE_TRAIL.minX + EAST_RIDGE_TRAIL.maxX) / 2, VALE.maxZ - 1)).toContain('隐秘空地')
    expect(lockedGatePrompt(p, { north: false, bridge: false, ascent: false }, 0, 0)).toBeNull()
  })
})
