import { describe, expect, it } from 'vitest'
import { dampAngle, dampFactor, movementAxis, wrapAngle } from './movement'
describe('movement', () => {
  it('normalizes diagonals', () => { const axis = movementAxis(new Set(['KeyW', 'KeyD'])); expect(Math.hypot(axis.x, axis.z)).toBeCloseTo(1); expect(axis.z).toBeLessThan(0) })
  it('cancels opposing inputs', () => { expect(movementAxis(new Set(['KeyW', 'KeyS']))).toEqual({ x: 0, z: 0 }) })
  it('smooths independently of frame rate', () => {
    let a = 0, b = 0
    for (let i = 0; i < 60; i++) a += (1 - a) * dampFactor(10, 1 / 60)
    for (let i = 0; i < 30; i++) b += (1 - b) * dampFactor(10, 1 / 30)
    expect(a).toBeCloseTo(b, 10)
  })
  it('turns along the shortest arc', () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI)
    const turned = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 1000, 1)
    expect(Math.abs(wrapAngle(turned - (-Math.PI + 0.1)))).toBeLessThan(1e-6)
    expect(dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 5, 0.01)).toBeGreaterThan(Math.PI - 0.1)
  })
})
