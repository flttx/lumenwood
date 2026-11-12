import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { InputState } from '../input/input'
import { dampAngle, dampFactor, movementAxis, PLAYER_RADIUS, RUN_SPEED, WALK_SPEED } from './movement'
import { pushOutOfBox, resolveCollisions } from './collision'
import { rockColliders, treeColliders } from '../world/zones/forestLayout'
import { cabinCollider, campBoxColliders, campCircleColliders } from '../world/zones/campLayout'
import { deckHeight, fenceColliders, logColliders, shrubColliders, signpostColliders, stoneColliders, stumpColliders } from '../world/zones/sceneryLayout'
import { clampToRegions, onBridge, walkableRegions } from '../world/regions'
import { deepPoolColliders } from '../world/zones/wetlandLayout'
import { treeCollider } from '../world/zones/highlandLayout'
import { heightAt, pathWeight } from '../world/terrain/terrain'
import { wading } from '../world/zones/wetlandLayout'
import { soundscape } from '../audio/engine'
import { lanternColliders } from '../features/route/routeLayout'
import { Character } from './Character'
import { useGameStore } from '../../state/gameStore'
const ACCELERATION = 12, DECELERATION = 9, TURN_RATE = 14
// Footstep cadence (s per step) and the speed below which no steps sound; wading steps are the water's own splashes.
const WALK_STEP = 0.42, RUN_STEP = 0.3, STEP_MIN_SPEED = 0.6
const circleColliders = [...treeColliders, ...lanternColliders, ...deepPoolColliders, ...rockColliders, ...stoneColliders, ...shrubColliders, ...stumpColliders, ...signpostColliders, ...campCircleColliders, treeCollider]
const boxColliders = [cabinCollider, ...campBoxColliders, ...logColliders, ...fenceColliders]
export function Player({ input, position, velocity }: { input: InputState; position: Vector3; velocity: Vector3 }) {
  const group = useRef<Group>(null!)
  const stepTimer = useRef(0)
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
      // The cabin clearing has no trees or posts, so resolving the cabin box after the trunks cannot push back into a trunk.
      const hitTree = resolveCollisions(position, PLAYER_RADIUS, circleColliders), hitCabin = boxColliders.reduce((hit, box) => pushOutOfBox(position, PLAYER_RADIUS, box) || hit, false)
      const clamped = clampToRegions(position, walkableRegions())
      // Keep only the motion that actually happened so speed does not build up against obstacles.
      if (hitTree || hitCabin || clamped) { velocity.x = (position.x - px) / dt; velocity.z = (position.z - pz) / dt }
    }
    // Wading: the feet follow the pool floor; the light bridge carries the player level over the channel.
    position.y = onBridge(position.x, position.z) ? 0 : Math.max(heightAt(position.x, position.z), deckHeight(position.x, position.z))
    group.current.position.copy(position)
    const moving = Math.hypot(velocity.x, velocity.z)
    if (moving < STEP_MIN_SPEED) stepTimer.current = 0.12 // the first step lands shortly after setting off
    else if ((stepTimer.current -= dt) <= 0 && !wading(position.x, position.y, position.z)) {
      stepTimer.current = moving > WALK_SPEED + 0.5 ? RUN_STEP : WALK_STEP
      const deck = deckHeight(position.x, position.z) > heightAt(position.x, position.z)
      const surface = deck || onBridge(position.x, position.z) ? 'wood' : pathWeight(position.x, position.z) > 0.45 ? 'dirt' : 'grass'
      soundscape.footstep(surface, position.x, position.y + 0.05, position.z, Math.min(1, moving / RUN_SPEED))
    }
    if (Math.hypot(velocity.x, velocity.z) > 0.2) group.current.rotation.y = dampAngle(group.current.rotation.y, Math.atan2(velocity.x, velocity.z), TURN_RATE, dt)
  }, -1)
  return <group ref={group}><Character velocity={velocity}/></group>
}
