import { glowFlowers } from './campLayout'
import { gladeFlowers, wetlandFlowers } from './wetlandLayout'
// Every INT-001 flower in the world. Camp flowers come first so their indices (chime pitch, route bookkeeping) never move.
export type FlowerZone = 'camp' | 'wetland' | 'glade'
export interface FlowerSpot { x: number; z: number; angle: number; zone: FlowerZone }
export const flowers: FlowerSpot[] = [
  ...glowFlowers.map(f => ({ ...f, zone: 'camp' as const })),
  ...wetlandFlowers.map(([x, z], i) => ({ x, z, angle: i * 1.913 + 0.4, zone: 'wetland' as const })),
  ...gladeFlowers.map(([x, z], i) => ({ x, z, angle: i * 1.256, zone: 'glade' as const })),
]
