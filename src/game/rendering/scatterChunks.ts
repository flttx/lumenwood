// Spatial chunking for instanced scatter (trees, undergrowth, rocks). Pure helpers, unit-tested; Scatter.tsx renders them.
export interface ScatterItem { x: number; y: number; z: number; angle: number; scale: number }
export interface Chunk { key: string; cx: number; cz: number; radius: number; items: ScatterItem[] }

/** Groups items into square cells of `size` metres; each chunk knows its centre and a radius covering every item. */
export function chunkItems(items: readonly ScatterItem[], size: number): Chunk[] {
  const cells = new Map<string, ScatterItem[]>()
  for (const item of items) {
    const key = `${Math.floor(item.x / size)},${Math.floor(item.z / size)}`
    const list = cells.get(key)
    if (list) list.push(item)
    else cells.set(key, [item])
  }
  return [...cells].map(([key, list]) => {
    const cx = list.reduce((s, i) => s + i.x, 0) / list.length, cz = list.reduce((s, i) => s + i.z, 0) / list.length
    const radius = list.reduce((r, i) => Math.max(r, Math.hypot(i.x - cx, i.z - cz)), 0)
    return { key, cx, cz, radius, items: list }
  })
}

/**
 * Which LOD a chunk shows from `distance` (camera to chunk centre, minus the chunk radius so its nearest item counts):
 * 0 near, 1 beyond `lodDistance` (when the asset has an LOD1), or -1 hidden beyond `maxDistance`.
 * Optional `previous` + `hysteresis` prevent chunks from popping rapidly when walking along a boundary.
 */
export function chunkLod(distance: number, radius: number, lodDistance: number, maxDistance: number, hasLod1: boolean, previous = -1, hysteresis = 0) {
  const nearest = Math.max(0, distance - radius)
  const hideAt = previous >= 0 ? maxDistance + hysteresis : maxDistance
  if (nearest > hideAt) return -1
  if (!hasLod1) return 0
  const switchAt = previous === 0 ? lodDistance + hysteresis : previous === 1 ? Math.max(0, lodDistance - hysteresis) : lodDistance
  return nearest > switchAt ? 1 : 0
}
