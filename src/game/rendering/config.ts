import type { Quality } from '../../state/gameStore'
// shadowMapSize 0 turns sun shadows off.
export const qualitySettings: Record<Quality, { dpr: [number, number]; shadowMapSize: number }> = {
  low: { dpr: [1, 1], shadowMapSize: 0 }, medium: { dpr: [1, 1.5], shadowMapSize: 1024 }, high: { dpr: [1, 2], shadowMapSize: 2048 },
}
