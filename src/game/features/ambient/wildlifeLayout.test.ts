import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { open, rabbitHomes } from './Wildlife'
import { standDensity } from '../../world/zones/forestLayout'
import { butterflyHomes, dragonflyHomes } from './ambientLayout'

describe('wildlife homes', () => {
  it('puts rabbits on open, free ground in the glades', () => {
    const homes = rabbitHomes()
    expect(homes.length).toBeGreaterThan(10)
    for (const h of homes) { expect(open(h.x, h.z)).toBe(true); expect(standDensity(h.x, h.z)).toBeLessThanOrEqual(0.3) }
    if (process.env.DUMP_HOMES) writeFileSync(process.env.DUMP_HOMES, JSON.stringify(homes))
  })
  it('gives butterflies and dragonflies somewhere to live', () => {
    expect(butterflyHomes().length).toBeGreaterThan(60)
    expect(dragonflyHomes().length).toBeGreaterThan(5)
  })
})
