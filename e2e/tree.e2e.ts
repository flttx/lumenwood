import {test, expect} from '@playwright/test'
import {enterForest, teleport} from './helpers'
import {outerTrees} from '../src/game/world/zones/forestLayout'
import {CAMP} from '../src/game/world/regions'

test('nearby backdrop redwood uses the intact near mesh', async ({page}) => {
  await enterForest(page)
  const tree = outerTrees.find(t => t.kind === 'redwood' && t.x > CAMP.minX && t.x < CAMP.maxX && t.z > CAMP.maxZ && t.z < CAMP.maxZ + 7)!
  expect(tree).toBeTruthy()
  await teleport(page, tree.x, CAMP.maxZ - 1)
  await expect.poll(() => page.evaluate(({x,z}) => {
    let match = 0
    window.__lumenwood!.scene.traverse(o => {
      const mesh = o as import('three').InstancedMesh
      if (!mesh.isInstancedMesh || !mesh.visible) return
      const a = mesh.instanceMatrix.array
      for (let i = 0; i < mesh.count; i++) if (Math.hypot(a[i * 16 + 12] - x, a[i * 16 + 14] - z) < 0.01) match = mesh.geometry.index?.count ?? 0
    })
    return match
  }, tree), {timeout: 10000}).toBe(22065)
})
