import { describe, expect, it } from 'vitest'
import { advanceSunlight, createSunlight, hasDaylight, parseSunlight, rotateSunMirror, safeSunlightSpawn, traceSunlight } from './progress'
import { sunlightDeckHeight, SUN_REWARD_INDEX } from './layout'
import { pushOutOfSunRavine } from './collision'
import { sunIslandDistance, sunOuterDistance, sunRavineDepth, sunRavineGap } from './landform'
import { heightAt } from '../../world/terrain/terrain'
import { createProgress } from '../route/progress'
import { parseSave, restore, serialize } from '../route/save'
import { sunlightObjective } from './objective'
import { seedAvailable } from '../secrets/secrets'
import { journeyBlend } from '../../rendering/timeOfDay'

describe('daytime sunlight crossing', () => {
  it('requires the two-mirror path; wrong headings, rock and loops cannot feed the plant', () => {
    const solutions: number[][] = []
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) if (traceSunlight([a, b], true).receiver) solutions.push([a, b])
    expect(solutions).toEqual([[2, 0]])
    const rock = traceSunlight([0, 4], true)
    expect(rock.segments[0].hit).toBe('rock'); expect(rock.segments[0].to.z).toBeCloseTo(-8.45)
    expect(traceSunlight([2, 6], true)).toMatchObject({ loop: true, receiver: false })
    expect(traceSunlight([2, 0], false).segments).toHaveLength(0)
    const s = createSunlight(); rotateSunMirror(s, 0, -1); expect(s.steps[0]).toBe(7)
    expect(hasDaylight(1)).toBe(false)
  })
  it('charges only while receiving sunlight and keeps the finished bridge after light is lost', () => {
    const s = createSunlight(); s.steps = [2, 0]
    for (let i = 0; i < 20; i++) advanceSunlight(s, 0.1, true, i / 10)
    expect(s.grownAt).toBeNull(); expect(s.growth).toBeCloseTo(2 / 3)
    advanceSunlight(s, 0.1, false, 2); expect(s.growth).toBeLessThan(2 / 3)
    for (let i = 0; i < 30; i++) advanceSunlight(s, 0.1, true, 3 + i / 10)
    expect(s.grownAt).not.toBeNull()
    rotateSunMirror(s, 1, 1); advanceSunlight(s, 0.1, false, 10)
    expect(s.growth).toBe(1)
  })
  it('blocks the ravine before growth, opens only the bridge, and keeps deck heights on both banks', () => {
    const blocked = { x: 22.5, z: -12.9 }
    pushOutOfSunRavine(blocked, 0.35, false)
    expect(blocked.z).toBeLessThanOrEqual(-13.35)
    const open = { x: 22.5, z: -10 }
    expect(pushOutOfSunRavine(open, 0.35, true)).toBe(false)
    const edge = { x: 23.6, z: -10 }
    expect(pushOutOfSunRavine(edge, 0.35, true)).toBe(true)
    expect(edge.x).toBeCloseTo(23.5)
    expect(heightAt(22.5, -10)).toBeLessThan(-2)
    expect(heightAt(22.5, -5)).toBeCloseTo(0)
    expect(sunlightDeckHeight(22.5, -14, true)).toBeCloseTo(0)
    expect(sunlightDeckHeight(22.5, -9.5, true)).toBeCloseTo(0.65)
    expect(sunlightDeckHeight(22.5, -5, true)).toBeCloseTo(0)
    expect(sunlightDeckHeight(22.5, -10, false)).toBe(-Infinity)
  })
  it('keeps feet on dry land around both irregular banks', () => {
    for (const inner of [false, true]) for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2, cx = 24, cz = inner ? -1.4 : -2.8
      let lo = 0, hi = inner ? 8 : 16
      // Find the land/gap boundary along each radial direction. The inner and outer search bands never overlap.
      for (let step = 0; step < 30; step++) {
        const r = (lo + hi) / 2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r
        // Direct ellipse distances select the intended edge rather than the opposite bank.
        const gap = inner ? sunIslandDistance(x, z) : sunOuterDistance(x, z)
        if (gap > 0) hi = r; else lo = r
      }
      const r = (lo + hi) / 2 + (inner ? 0.1 : -0.1), point = { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }
      expect(pushOutOfSunRavine(point, 0.35, false)).toBe(true)
      expect(sunRavineGap(point.x, point.z)).toBeLessThanOrEqual(-0.348)
      expect(sunRavineDepth(point.x, point.z)).toBe(0)
    }
  })
  it('has no walk-around route to the island before growth, then connects through the bridge only', () => {
    const reachable = (grown: boolean) => {
      const queue: [number, number][] = [[45, -30]], seen = new Set<string>() // half-metre grid, start at bridge bank
      for (let head = 0; head < queue.length; head++) {
        const [ix, iz] = queue[head], key = `${ix},${iz}`
        if (seen.has(key) || ix < 28 || ix > 68 || iz < -36 || iz > 20) continue
        seen.add(key)
        const p = { x: ix / 2, z: iz / 2 }, before = { ...p }
        pushOutOfSunRavine(p, 0.35, grown)
        if (Math.hypot(p.x - before.x, p.z - before.z) > 0.005) continue
        if (ix === 44 && iz === 0) return true
        queue.push([ix + 1, iz], [ix - 1, iz], [ix, iz + 1], [ix, iz - 1])
      }
      return false
    }
    expect(reachable(false)).toBe(false); expect(reachable(true)).toBe(true)
  })
  it('round-trips mirrors and permanent growth, preserves old progress and moves old ravine saves to safety', () => {
    const p = createProgress(); p.sunlight = { steps: [2, 0], growth: 1, grownAt: 3, crossed: true }
    const q = createProgress(), data = parseSave(JSON.stringify(serialize(p, [22.5, -10])))!
    restore(q, data, 10)
    expect(q.sunlight).toMatchObject({ steps: [2, 0], growth: 1, crossed: true })
    expect(data.position).toEqual([22.5, -10])
    expect(safeSunlightSpawn([20, -6], true)).toEqual([14, -16]) // a former rectangular island corner is now bank slope
    const old = serialize(createProgress(), [22.5, -10]); delete old.sunlight; old.released = [0, 1]; old.lit[0] = true
    const migrated = parseSave(JSON.stringify(old))!
    expect(migrated.position).toEqual([14, -16]); restore(q, migrated, 10)
    expect(q.released.size).toBe(2); expect(q.litAt[0]).not.toBeNull(); expect(q.sunlight.growth).toBe(0)
    expect(parseSunlight({ steps: [-1, 9], grown: true })).toEqual({ steps: [0, 4], grown: false, crossed: false })
    expect(parseSunlight({ steps: [2, 0], grown: false, crossed: true }).crossed).toBe(false)
  })
  it('guides the actual action, gates the reward and advances journey light only after the crossing', () => {
    const p = createProgress()
    expect(sunlightObjective(p, 0, 0, 0)?.id).toBe('sun-first')
    p.sunlight.steps[0] = 2
    expect(sunlightObjective(p, 13, -17, 0)?.id).toBe('sun-second')
    expect(seedAvailable(p, SUN_REWARD_INDEX)).toBe(false)
    p.sunlight.grownAt = 5; p.sunlight.growth = 1
    expect(seedAvailable(p, SUN_REWARD_INDEX)).toBe(true)
    expect(sunlightObjective(p, 22.5, -8, 0)?.id).toBe('sun-reward')
    p.sunlight.crossed = true
    expect(sunlightObjective(p, 22, 0, 0)?.id).toBe('sun-return')
    expect(sunlightObjective(p, 14, -16, 0)).toBeNull()
    expect(journeyBlend(0, 0, 0, 9, true)).toBe(0.3)
    const advanced = createProgress(); advanced.litAt[0] = 1
    expect(sunlightObjective(advanced, 0, 0, 0)).toBeNull()
    expect(sunlightObjective(createProgress(), 0, 0, 2)).toBeNull()
  })
})
