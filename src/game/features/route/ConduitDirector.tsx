import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, Points, Vector3 } from 'three'
import type { InputState } from '../../input/input'
import { useGameStore } from '../../../state/gameStore'
import { ANCIENT_TREE, PLATEAU_HEIGHT } from '../../world/zones/highlandLayout'
import { LANTERN_COST, LANTERN_RANGE, lanternPlacements, zoneLanterns } from './routeLayout'
import { markActivity, route, routeClock } from './progress'
import { advanceConduit, conduit, createConduit, facingTree, nextCradle } from './conduit'
import { soundscape } from '../../audio/engine'
import { createMoteMaterial } from './moteMaterial'

const CONDUIT_MOTES = 28

/** Three connected cradles: roots → trunk → crown. The beam and spiraling motes are procedural effects over INT-003. */
export function ConduitDirector({ player, input }: { player: Vector3; input: InputState }) {
  const dpr = useThree(s => s.viewport.dpr)
  const beam = useRef<Mesh>(null!)
  const sparksRef = useRef<Points>(null!)
  const scratch = useMemo(() => {
    const sparkGeo = new BufferGeometry()
    sparkGeo.setAttribute('position', new BufferAttribute(new Float32Array(CONDUIT_MOTES * 3), 3))
    sparkGeo.setAttribute('aAlpha', new BufferAttribute(new Float32Array(CONDUIT_MOTES), 1))
    const sparkMat = createMoteMaterial(0xffe7a8)
    return {
      forward: new Vector3(), from: new Vector3(), direction: new Vector3(), up: new Vector3(0, 1, 0),
      sideA: new Vector3(), sideB: new Vector3(),
      wasHeld: false, pulseTimer: 0, sparkGeo, sparkMat,
    }
  }, [])
  useEffect(() => {
    Object.assign(conduit, createConduit())
    return () => {
      Object.assign(conduit, createConduit())
      scratch.sparkGeo.dispose(); scratch.sparkMat.dispose()
    }
  }, [scratch])
  useFrame(({ camera }, dt) => {
    if (useGameStore.getState().phase !== 'playing') { conduit.ready = -1; return }
    const nodes = zoneLanterns('highland'), expected = nextCradle(route)
    const near = nodes.find(i => route.litAt[i] === null && Math.hypot(player.x - lanternPlacements[i].x, player.z - lanternPlacements[i].z) <= LANTERN_RANGE) ?? -1
    camera.getWorldDirection(scratch.forward)
    const held = input.keys.has('KeyE')
    const aligned = facingTree(player.x, player.z, scratch.forward.x, scratch.forward.z)
    // Audible & visual rejection cue when pressing E at a wrong-order cradle or without enough fireflies.
    if (held && !scratch.wasHeld && near >= 0 && (near !== expected || route.carried < LANTERN_COST)) {
      const [lx, ly, lz] = lanternPlacements[near].light
      route.shortAt[near] = routeClock.now
      soundscape.cue('reject', lx, ly, lz)
    }
    scratch.wasHeld = held
    const prevCharge = conduit.charge
    advanceConduit(conduit, dt, near, expected, route.carried, aligned, held)
    if (conduit.charge > prevCharge) {
      markActivity()
      if ((scratch.pulseTimer -= Math.min(dt, 0.1)) <= 0) {
        scratch.pulseTimer = 0.34
        const [lx, ly, lz] = lanternPlacements[near].light
        soundscape.cue('conduit', lx, ly, lz, conduit.charge)
      }
    } else scratch.pulseTimer = 0
    const show = near >= 0 && near === expected && conduit.charge > 0.005
    beam.current.visible = show
    sparksRef.current.visible = show
    if (!show) return
    scratch.from.fromArray(lanternPlacements[near].light)
    const stage = nodes.indexOf(expected), height = [2, 8, 17][stage]
    scratch.direction.set(ANCIENT_TREE[0], PLATEAU_HEIGHT + height, ANCIENT_TREE[1]).sub(scratch.from)
    const fullLength = scratch.direction.length()
    const length = fullLength * conduit.charge
    scratch.direction.normalize()
    beam.current.position.copy(scratch.from).addScaledVector(scratch.direction, length / 2)
    beam.current.quaternion.setFromUnitVectors(scratch.up, scratch.direction)
    beam.current.scale.set(1 + 0.55 * conduit.charge, Math.max(0.001, length), 1 + 0.55 * conduit.charge)
    // Spiral luminous motes racing up the beam into the Ancient Tree as charge builds.
    scratch.sideA.crossVectors(scratch.direction, scratch.up)
    if (scratch.sideA.lengthSq() < 0.001) scratch.sideA.set(1, 0, 0)
    else scratch.sideA.normalize()
    scratch.sideB.crossVectors(scratch.direction, scratch.sideA).normalize()
    const pos = scratch.sparkGeo.attributes.position as BufferAttribute, alp = scratch.sparkGeo.attributes.aAlpha as BufferAttribute
    const now = routeClock.now
    for (let i = 0; i < CONDUIT_MOTES; i++) {
      const u = ((i / CONDUIT_MOTES) + now * (0.9 + 0.6 * conduit.charge)) % 1
      const dist = u * length
      const angle = u * 12 + now * 6 + i * 0.7
      const r = (0.14 + 0.22 * (1 - u)) * (0.6 + 0.5 * conduit.charge)
      const px = scratch.from.x + scratch.direction.x * dist + (scratch.sideA.x * Math.cos(angle) + scratch.sideB.x * Math.sin(angle)) * r
      const py = scratch.from.y + scratch.direction.y * dist + (scratch.sideA.y * Math.cos(angle) + scratch.sideB.y * Math.sin(angle)) * r
      const pz = scratch.from.z + scratch.direction.z * dist + (scratch.sideA.z * Math.cos(angle) + scratch.sideB.z * Math.sin(angle)) * r
      pos.setXYZ(i, px, py, pz)
      alp.setX(i, Math.sin(u * Math.PI) * (0.55 + 0.45 * conduit.charge))
    }
    scratch.sparkMat.uniforms.uTime.value = now
    scratch.sparkMat.uniforms.uSize.value = (88 + 45 * conduit.charge) * dpr
    scratch.sparkMat.uniforms.uOpacity.value = 0.85
    pos.needsUpdate = alp.needsUpdate = true
  })
  return <>
    <mesh ref={beam} name="Highland-Conduit-Light" visible={false}>
      <cylinderGeometry args={[0.042, 0.042, 1, 8]}/>
      <meshBasicMaterial color="#ffe1a0" transparent opacity={0.72} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
    </mesh>
    <points ref={sparksRef} geometry={scratch.sparkGeo} material={scratch.sparkMat} visible={false} frustumCulled={false}/>
  </>
}
