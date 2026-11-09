import type { Quality } from '../../state/gameStore'
export const qualitySettings: Record<Quality, { dpr: [number, number] }> = {
  low: { dpr: [1, 1] }, medium: { dpr: [1, 1.5] }, high: { dpr: [1, 2] },
}
