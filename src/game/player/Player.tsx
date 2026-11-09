import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { InputState } from '../input/input'
import { clampPosition, dampAngle, dampFactor, movementAxis, PLAYER_RADIUS, RUN_SPEED, WALK_SPEED } from './movement'
import { resolveCollisions } from './collision'
import { treeColliders } from '../world/zones/forestLayout'
import { useGameStore } from '../../state/gameStore'
const ACCELERATION = 12, DECELERATION = 9, TURN_RATE = 14
export function Player({ input, position, velocity }: { input: InputState; position: Vector3; velocity: Vector3 }) {
  const group = useRef<Group>(null!)
  useFrame((_, delta) => {
    if (useGameStore.getState().phase !== 'playing') { input.keys.clear(); velocity.set(0, 0, 0); return }
    const dt = Math.min(delta, 0.05)
    const { x, z } = movementAxis(input.keys)
    const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw)
    const speed = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') ? RUN_SPEED : WALK_SPEED
    const tx = (x * cos + z * sin) * speed, tz = (-x * sin + z * cos) * speed
    const k = dampFactor(x || z ? ACCELERATION : DECELERATION, dt)
    velocity.x += (tx - velocity.x) * k; velocity.z += (tz - velocity.z) * k
    if (Math.hypot(velocity.x, velocity.z) < 0.01 && !x && !z) velocity.set(0, 0, 0)
    if (dt > 0 && (velocity.x || velocity.z)) {
      const px = position.x, pz = position.z
      position.x += velocity.x * dt; position.z += velocity.z * dt
      const hit = resolveCollisions(position, PLAYER_RADIUS, treeColliders)
      const cx = clampPosition(position.x), cz = clampPosition(position.z)
      // Keep only the motion that actually happened so speed does not build up against obstacles.
      if (hit || cx !== position.x || cz !== position.z) { position.x = cx; position.z = cz; velocity.x = (cx - px) / dt; velocity.z = (cz - pz) / dt }
    }
    group.current.position.copy(position)
    if (Math.hypot(velocity.x, velocity.z) > 0.2) group.current.rotation.y = dampAngle(group.current.rotation.y, Math.atan2(velocity.x, velocity.z), TURN_RATE, dt)
  }, -1)
  return <group ref={group}>
    <mesh position={[0, 0.95, 0]}><capsuleGeometry args={[0.35, 0.7, 4, 8]} /><meshStandardMaterial color="#d7b99a" roughness={0.9}/></mesh>
    <mesh position={[0, 1.75, 0]}><sphereGeometry args={[0.28, 12, 10]}/><meshStandardMaterial color="#e5ceb1"/></mesh>
    <mesh position={[0, 0.95, 0.34]}><boxGeometry args={[0.24, 0.28, 0.12]}/><meshStandardMaterial color="#687f70"/></mesh>
  </group>
}
