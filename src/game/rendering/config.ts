import type { Quality } from '../../state/gameStore'
// shadowMapSize 0 turns sun shadows off; grassBlades is the size of the code grass patch around the camera; localLights is
// how many point lights follow the lanterns and flowers nearest the camera (LocalLights.tsx).
export const qualitySettings: Record<Quality, { dpr: [number, number]; shadowMapSize: number; grassBlades: number; localLights: number }> = {
  low: { dpr: [1, 1], shadowMapSize: 0, grassBlades: 22000, localLights: 2 }, medium: { dpr: [1, 1.5], shadowMapSize: 2048, grassBlades: 55000, localLights: 4 }, high: { dpr: [1, 2], shadowMapSize: 4096, grassBlades: 80000, localLights: 4 },
}
