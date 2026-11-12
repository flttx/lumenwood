import type { CircleCollider } from '../../player/collision'
import type { CylinderOccluder } from '../../camera/occlusion'
import { smoothstep } from '../../shared/math'
import { at, sz } from '../scale'
// Ancient Tree Highlands (P4): a ramp climbs north out of the glade to a plateau around the VEG-002 ancient tree.
// The whole land north of the glade rises by `elevation()`, hills included, so the plateau sits above the forest.
// Positions are provisional and checked by highlandLayout.test.ts.
export const PLATEAU_HEIGHT = 12, RAMP_FROM = sz(76), RAMP_TO = sz(100)
/** Height the land north of the glade is lifted by: 0 up to the glade's north edge, PLATEAU_HEIGHT on the plateau. */
export function elevation(z: number) { return PLATEAU_HEIGHT * smoothstep(RAMP_FROM, RAMP_TO, z) }
export const ANCIENT_TREE: [number, number] = at([-4, 116])
// VEG-002 is 24 m tall; its root mound spreads about 10 m at ground level and narrows to about 6 m at 3–5 m up (measured
// from the optimised mesh). The player stops at the mound, walking over only the low outer root tips.
export const TREE_HEIGHT = 24, TREE_ROOT_RADIUS = 7.5, TREE_TRUNK_RADIUS = 4.5
/** Height bands the tree lights up in, one per cradle: roots, trunk, canopy (model space, metres above its base). */
export const TREE_BANDS = [3, 11] as const
export const treeCollider: CircleCollider = { x: ANCIENT_TREE[0], z: ANCIENT_TREE[1], radius: TREE_ROOT_RADIUS }
export const treeOccluder: CylinderOccluder = { x: ANCIENT_TREE[0], z: ANCIENT_TREE[1], radius: TREE_TRUNK_RADIUS, height: TREE_HEIGHT, base: PLATEAU_HEIGHT }
/** Trail from the glade up the ramp and across the plateau to the edge of the root mound. */
export const highlandPath: [number, number][] = [...([[-4, 72], [-4, 80], [-3.6, 92], [-4.4, 99], [-8, 102.5], [-5, 104]] as const).map(at), [ANCIENT_TREE[0] - 3, ANCIENT_TREE[1] - 13]]
export const highlandFlowers = ([[-14, 101.5], [6, 103], [-19, 107.5], [9, 113.5], [-15, 125], [6, 124]] as const).map(at)
/** INT-003 cradles circle the tree just beyond its roots, so lighting all three walks the player around it. */
export const CRADLE_RING = 12.5
export const cradleSpots: [number, number][] = [-2.86, 0.24, 1.57].map(a => [ANCIENT_TREE[0] + Math.cos(a) * CRADLE_RING, ANCIENT_TREE[1] + Math.sin(a) * CRADLE_RING])
/** PRP-001 rock clusters: ramp shoulders (outside the walkable ramp, no collider needed) and plateau scatter. */
export const rampRocks: [number, number, number][] = ([[-7.4, 82, 1.1], [-0.6, 86, 1.3], [-7.6, 91, 1.5], [-0.4, 95.5, 1.2], [-8.2, 98.5, 1.6], [0.2, 99.5, 1.1]] as const).map(([x, z, s]) => [sz(x), sz(z), s * 1.6])
