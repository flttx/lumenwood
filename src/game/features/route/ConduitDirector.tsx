import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Mesh, Vector3 } from 'three'
import type { InputState } from '../../input/input'
import { useGameStore } from '../../../state/gameStore'
import { ANCIENT_TREE, PLATEAU_HEIGHT } from '../../world/zones/highlandLayout'
import { LANTERN_RANGE, lanternPlacements, zoneLanterns } from './routeLayout'
import { route } from './progress'
import { advanceConduit, conduit, createConduit, facingTree, nextCradle } from './conduit'

/** Three connected cradles: roots → trunk → crown. The beam is an effect; fixtures reuse registered INT-003. */
export function ConduitDirector({ player, input }: { player: Vector3; input: InputState }) {
  const beam = useRef<Mesh>(null!)
  const scratch = useMemo(() => ({ forward: new Vector3(), from: new Vector3(), direction: new Vector3(), up: new Vector3(0, 1, 0) }), [])
  useEffect(() => { Object.assign(conduit, createConduit()); return () => { Object.assign(conduit, createConduit()) } }, [])
  useFrame(({ camera }, dt) => {
    if (useGameStore.getState().phase !== 'playing') { conduit.ready = -1; return }
    const nodes = zoneLanterns('highland'), expected = nextCradle(route)
    const near = nodes.find(i => route.litAt[i] === null && Math.hypot(player.x - lanternPlacements[i].x, player.z - lanternPlacements[i].z) <= LANTERN_RANGE) ?? -1
    camera.getWorldDirection(scratch.forward)
    advanceConduit(conduit, dt, near, expected, route.carried, facingTree(player.x, player.z, scratch.forward.x, scratch.forward.z), input.keys.has('KeyE'))
    beam.current.visible = near >= 0 && near === expected && conduit.charge > 0.005
    if (!beam.current.visible) return
    scratch.from.fromArray(lanternPlacements[near].light)
    const stage = nodes.indexOf(expected), height = [2, 8, 17][stage]
    scratch.direction.set(ANCIENT_TREE[0], PLATEAU_HEIGHT + height, ANCIENT_TREE[1]).sub(scratch.from)
    const length = scratch.direction.length() * conduit.charge
    scratch.direction.normalize()
    beam.current.position.copy(scratch.from).addScaledVector(scratch.direction, length / 2)
    beam.current.quaternion.setFromUnitVectors(scratch.up, scratch.direction)
    beam.current.scale.set(1, Math.max(0.001, length), 1)
  })
  return <mesh ref={beam} name="Highland-Conduit-Light" visible={false}>
    <cylinderGeometry args={[0.025, 0.025, 1, 8]}/>
    <meshBasicMaterial color="#ffe1a0" transparent opacity={0.65} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
  </mesh>
}
