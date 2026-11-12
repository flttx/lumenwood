import type { Quality } from '../../state/gameStore'
// shadowMapSize 0 turns sun shadows off; grassBlades is the size of the code grass patch around the camera.
export const qualitySettings: Record<Quality, { dpr: [number, number]; shadowMapSize: number; grassBlades: number }> = {
  low: { dpr: [1, 1], shadowMapSize: 0, grassBlades: 15000 }, medium: { dpr: [1, 1.5], shadowMapSize: 2048, grassBlades: 35000 }, high: { dpr: [1, 2], shadowMapSize: 4096, grassBlades: 45000 },
}
