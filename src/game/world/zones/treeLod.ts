// Provisional switch distance; tune against measured budgets once more assets are in.
export const LOD1_DISTANCE = 16, LOD_HYSTERESIS = 2
/** Picks LOD 0 (near) or 1 (far) from camera distance; the hysteresis band keeps trees from flickering at the threshold. */
export function selectLod(distance: number, current: number) {
  if (current === 0) return distance > LOD1_DISTANCE + LOD_HYSTERESIS ? 1 : 0
  return distance < LOD1_DISTANCE - LOD_HYSTERESIS ? 0 : 1
}
