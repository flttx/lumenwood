// World scale (scene upgrade, 2026-11-12): the user asked for roughly 2.5× the walkable area. Every layout position, region
// and trail is authored at the original size and multiplied by WORLD_SCALE, so the relationships between them hold.
// Asset sizes (cabin, tree, lanterns), player reach and trail width do not scale.
export const WORLD_SCALE = 2.5
/** Scales a point authored at the original size. */
export const at = ([x, z]: readonly [number, number] | readonly number[]): [number, number] => [x * WORLD_SCALE, z * WORLD_SCALE]
export const sz = (v: number) => v * WORLD_SCALE
