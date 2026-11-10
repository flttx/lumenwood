import { describe, expect, it } from 'vitest'
import { gaitFor } from './gait'
import { RUN_SPEED, WALK_SPEED } from './movement'
describe('gaitFor', () => {
  it('maps rest, walking and running speeds to clips', () => {
    expect(gaitFor(0, 'idle')).toBe('idle')
    expect(gaitFor(WALK_SPEED, 'idle')).toBe('walk')
    expect(gaitFor(RUN_SPEED, 'walk')).toBe('run')
  })
  it('holds the current clip inside the hysteresis band', () => {
    expect(gaitFor(0.4, 'idle')).toBe('idle')
    expect(gaitFor(0.4, 'walk')).toBe('walk')
    expect(gaitFor(5.0, 'run')).toBe('run')
    expect(gaitFor(5.0, 'walk')).toBe('walk')
  })
})
