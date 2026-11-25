import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import type { InputState } from '../input/input'
import { dampAngle, dampFactor, movementAxis, PLAYER_RADIUS, RUN_SPEED, WALK_SPEED } from './movement'
import { hopState, requestHop, resetHop, stepHop } from './hop'
import { pushOutOfBox, resolveCollisions } from './collision'
import { rockColliders, treeColliders } from '../world/zones/forestLayout'
import { cabinCollider, campBoxColliders, campCircleColliders } from '../world/zones/campLayout'
import { bridgeRailColliders, deckHeight, fenceColliders, logColliders, shrubColliders, signpostColliders, stoneColliders, stumpColliders } from '../world/zones/sceneryLayout'
import { BEACH, REEF_CAUSEWAY, bridgeDeck, clampToRegions, onBridge, rectDistance, walkableRegions } from '../world/regions'
import { deepPoolColliders } from '../world/zones/wetlandLayout'
import { echoColliders, mushroomColliders, reefColliders, shrineCollider, starShrineCollider, valeColliders, valeShrineCollider } from '../world/zones/sideLayout'
import { treeCollider } from '../world/zones/highlandLayout'
import { heightAt, pathWeight } from '../world/terrain/terrain'
import { wading } from '../world/zones/wetlandLayout'
import { soundscape } from '../audio/engine'
import { lanternColliders } from '../features/route/routeLayout'
import { Character } from './Character'
import { useGameStore } from '../../state/gameStore'
import { sunlightCircles, sunlightDeckHeight } from '../features/sunlight/layout'
import { pushOutOfSunRavine } from '../features/sunlight/collision'
import { route, routeClock } from '../features/route/progress'
import { flowSpeedMultiplier, resonance, sustainFlow } from '../features/resonance/resonance'
import { livePose } from '../features/route/save'
const ACCELERATION = 12, DECELERATION = 9, TURN_RATE = 14, WADE_DRAG = 0.78
// Footstep cadence (s per step) and the speed below which no steps sound; wading steps are the water's own splashes.
const WALK_STEP = 0.42, RUN_STEP = 0.3, STEP_MIN_SPEED = 0.6
const circleColliders = [...sunlightCircles, ...mushroomColliders, ...echoColliders, shrineCollider, ...valeColliders, valeShrineCollider, ...reefColliders, starShrineCollider, ...treeColliders, ...lanternColliders, ...deepPoolColliders, ...rockColliders, ...stoneColliders, ...shrubColliders, ...stumpColliders, ...signpostColliders, ...campCircleColliders, treeCollider]
const boxColliders = [cabinCollider, ...campBoxColliders, ...logColliders, ...fenceColliders, ...bridgeRailColliders]
export function Player({ input, position, velocity }: { input: InputState; position: Vector3; velocity: Vector3 }) {
  const group = useRef<Group>(null!)
  const stepTimer = useRef(0)
  useEffect(() => {
    resetHop(hopState)
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      const s = useGameStore.getState()
      if (s.phase !== 'playing' || s.journalOpen || s.endingCard || s.contextLost) return
      e.preventDefault()
      requestHop(hopState)
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); resetHop(hopState) }
  }, [])
  useFrame((_, delta) => {
    const state = useGameStore.getState()
    if (state.phase !== 'playing' || state.journalOpen || state.endingCard || state.contextLost) { input.keys.clear(); velocity.set(0, 0, 0); return }
    const dt = Math.min(delta, 0.05)
    const axis = movementAxis(input.keys)
    const x = axis.x, z = axis.z || (state.autoWalk ? -1 : 0)
    const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw)
    const inShallow = wading(position.x, position.y, position.z)
    const baseSpeed = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') ? RUN_SPEED : WALK_SPEED
    const speed = baseSpeed * (inShallow ? WADE_DRAG : 1) * flowSpeedMultiplier(resonance.flow, resonance.combo)
    const tx = (x * cos + z * sin) * speed, tz = (-x * sin + z * cos) * speed
    const k = dampFactor(x || z ? ACCELERATION : DECELERATION, dt)
    velocity.x += (tx - velocity.x) * k; velocity.z += (tz - velocity.z) * k
    if (Math.hypot(velocity.x, velocity.z) < 0.01 && !x && !z) velocity.set(0, 0, 0)
    const sunGrown = route.sunlight.grownAt !== null
    if (dt > 0 && (velocity.x || velocity.z)) {
      const px = position.x, pz = position.z
      position.x += velocity.x * dt; position.z += velocity.z * dt
      // Jointly iterate circles, boxes, ravine, and region bounds so a corner box cannot push the player into an adjacent trunk.
      let hitAny = false
      const allowed = walkableRegions()
      for (let pass = 0; pass < 3; pass++) {
        let moved = resolveCollisions(position, PLAYER_RADIUS, circleColliders)
        for (const box of boxColliders) moved = pushOutOfBox(position, PLAYER_RADIUS, box) || moved
        moved = pushOutOfSunRavine(position, PLAYER_RADIUS, sunGrown) || moved
        moved = clampToRegions(position, allowed) || moved
        if (moved) hitAny = true
        else break
      }
      // Keep only the motion that actually happened so speed does not build up against obstacles.
      if (hitAny) { velocity.x = (position.x - px) / dt; velocity.z = (position.z - pz) / dt }
    }
    const groundY = heightAt(position.x, position.z)
    const bridgeY = deckHeight(position.x, position.z)
    const sunBridgeY = sunlightDeckHeight(position.x, position.z, sunGrown)
    const lightBridge = onBridge(position.x, position.z)
    const floorY = lightBridge ? bridgeDeck(position.z) : Math.max(groundY, bridgeY, sunBridgeY)
    const hopEvent = stepHop(hopState, dt)
    // Wading: the feet follow the pool floor; the bridges carry the player smoothly across water and ravine.
    position.y = floorY + hopState.offset
    group.current.position.copy(position)
    livePose.position = [position.x, position.z]
    livePose.view = [input.yaw, input.pitch]
    const moving = Math.hypot(velocity.x, velocity.z)
    if (moving > 1 && (lightBridge || bridgeY > groundY || sunBridgeY > groundY)) sustainFlow(resonance, routeClock.now, 0.55)
    const onWood = bridgeY > groundY || sunBridgeY > groundY
    const onBeach = (rectDistance(position.x, position.z, BEACH) === 0 && position.z < -56) || rectDistance(position.x, position.z, REEF_CAUSEWAY) === 0
    const surface = lightBridge ? 'crystal' : onWood ? 'wood' : onBeach ? 'sand' : pathWeight(position.x, position.z) > 0.45 ? 'dirt' : 'grass'
    if (hopEvent === 'takeoff') {
      if (wading(position.x, floorY, position.z)) soundscape.splash(position.x, floorY + 0.05, position.z, 0.55)
      else soundscape.footstep(surface, position.x, floorY + 0.05, position.z, 0.55)
    } else if (hopEvent === 'land') {
      if (wading(position.x, floorY, position.z)) soundscape.splash(position.x, floorY + 0.05, position.z, 0.9)
      else soundscape.footstep(surface, position.x, floorY + 0.05, position.z, 0.95)
      stepTimer.current = 0.2
    }
    if (!hopState.grounded || moving < STEP_MIN_SPEED) stepTimer.current = 0.12 // no footsteps while airborne or idle
    else if ((stepTimer.current -= dt) <= 0 && !wading(position.x, position.y, position.z)) {
      stepTimer.current = moving > WALK_SPEED + 0.5 ? RUN_STEP : WALK_STEP
      soundscape.footstep(surface, position.x, position.y + 0.05, position.z, Math.min(1, moving / RUN_SPEED))
    }
    if (moving > 0.2) group.current.rotation.y = dampAngle(group.current.rotation.y, Math.atan2(velocity.x, velocity.z), TURN_RATE, dt)
  }, -1)
  return <group ref={group}><Character velocity={velocity} position={position}/></group>
}
