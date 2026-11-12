import { treeColliders } from '../src/game/world/zones/forestLayout'
import { fenceColliders, logColliders, stoneColliders } from '../src/game/world/zones/sceneryLayout'
import { lanternColliders } from '../src/game/features/route/routeLayout'
import { cabinCollider } from '../src/game/world/zones/campLayout'
import { CAMP } from '../src/game/world/regions'
import { PLAYER_RADIUS } from '../src/game/player/movement'
// Test placements picked from the real collision layout (the world is generated, so fixed coordinates would go stale).
const circles = [...treeColliders, ...lanternColliders, ...stoneColliders]
const boxes = [cabinCollider, ...logColliders, ...fenceColliders]
/** True if a player-sized lane from (x, z0) to (x, z1) along +Z, or (x0..x1, z) along +X, touches nothing but `except`. */
function laneClear(points: [number, number][], except?: { x: number; z: number }) {
  return points.every(([x, z]) => circles.every(c => c === except || Math.hypot(x - c.x, z - c.z) > c.radius + PLAYER_RADIUS + 0.4)
    && boxes.every(b => Math.hypot(x - b.x, z - b.z) > Math.max(b.halfX, b.halfZ) + PLAYER_RADIUS + 0.6))
}
const range = (a: number, b: number, step = 0.5) => Array.from({ length: Math.ceil((b - a) / step) + 1 }, (_, i) => a + i * step)
/** A camp trunk with nothing else in the 5 m south of it: walking north (+Z) from there runs straight into it. */
export const openTrunk = (() => {
  const tree = treeColliders.find(t => Math.abs(t.x) < CAMP.maxX - 8 && Math.abs(t.z) < CAMP.maxZ - 8
    && laneClear(range(t.z - t.radius - 5, t.z - t.radius - 0.2).map(z => [t.x, z] as [number, number]), t))
  if (!tree) throw new Error('no open trunk in the camp layout')
  return tree
})()
/** A z where the last 6 m before the camp's east edge are clear, for walking into the boundary. */
export const openEastEdge = (() => {
  const z = range(CAMP.minZ + 6, CAMP.maxZ - 6, 1).find(z => laneClear(range(CAMP.maxX - 6, CAMP.maxX).map(x => [x, z] as [number, number])))
  if (z === undefined) throw new Error('no open stretch on the camp edge')
  return z
})()
