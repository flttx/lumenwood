import { describe, expect, it } from 'vitest'
import { chunkItems, chunkLod } from './scatterChunks'
const at = (x: number, z: number) => ({ x, y: 0, z, angle: 0, scale: 1 })
describe('scatter chunks', () => {
  it('groups items by cell and keeps every item exactly once', () => {
    const items = [at(1, 1), at(5, 3), at(40, 1), at(-3, -3)]
    const chunks = chunkItems(items, 32)
    expect(chunks.length).toBe(3)
    expect(chunks.reduce((n, c) => n + c.items.length, 0)).toBe(items.length)
    const first = chunks.find(c => c.items.length === 2)!
    expect(first.cx).toBe(3); expect(first.radius).toBeCloseTo(Math.hypot(2, 1))
  })
  it('switches to LOD1 past the LOD distance and hides past the view distance, measured to the chunk edge', () => {
    expect(chunkLod(10, 5, 30, 100, true)).toBe(0)
    expect(chunkLod(40, 5, 30, 100, true)).toBe(1)
    expect(chunkLod(40, 5, 30, 100, false)).toBe(0) // no LOD1 to switch to
    expect(chunkLod(104, 5, 30, 100, true)).toBe(1) // edge still within view
    expect(chunkLod(106, 5, 30, 100, true)).toBe(-1)
  })
})
