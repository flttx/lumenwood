import { Suspense, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import type { Group, Vector3 } from 'three'
import { assetConfig } from '../assets/config'
import { dampFactor, RUN_SPEED, WALK_SPEED } from './movement'
import { heightAt } from '../world/terrain/terrain'
import { resonance } from '../features/resonance/resonance'
import { gaitFor } from './gait'
import { hopState } from './hop'
import { HandLantern } from './HandLantern'
import { useGameStore } from '../../state/gameStore'
// CHR-001 (docs/ASSET_MANIFEST.md): one skinned mesh with in-place idle / walk / run clips; facing +Z like the player group.
const CHARACTER_URL = `${assetConfig.baseUrl}models/character/CHR-001.glb`
const FADE = 0.22
useGLTF.preload(CHARACTER_URL, false, false)

const wrapPi = (a: number) => {
  let d = a % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  else if (d < -Math.PI) d += Math.PI * 2
  return d
}

export function Character({ velocity, position }: { velocity: Vector3; position: Vector3 }) {
  const group = useRef<Group>(null), tiltGroup = useRef<Group>(null)
  const { scene, animations } = useGLTF(CHARACTER_URL, false, false)
  const { actions, mixer } = useAnimations(animations, group)
  const current = useRef('idle')
  const prevHeading = useRef<number | null>(null)
  useEffect(() => { actions.idle?.reset().play() }, [actions])
  useEffect(() => scene.traverse(o => { o.castShadow = true }), [scene])
  useFrame((_, delta) => {
    const playing = useGameStore.getState().phase === 'playing'
    mixer.timeScale = playing ? 1 : 0
    if (!playing) return
    const dt = Math.min(delta, 0.05)
    const speed = Math.hypot(velocity.x, velocity.z), gait = gaitFor(speed, current.current)
    if (gait !== current.current) {
      const prev = actions[current.current], next = actions[gait]
      // Stop any lingering third clip so rapid idle → walk → run transitions never stack three active tracks.
      for (const [name, clip] of Object.entries(actions)) {
        if (clip && name !== current.current && name !== gait) clip.stop()
      }
      if (next) {
        next.reset()
        // Synchronize normalized stride phase across walk ↔ run transitions to avoid foot snaps.
        if (prev && (current.current === 'walk' || current.current === 'run') && (gait === 'walk' || gait === 'run')) {
          const prevDur = prev.getClip().duration || 1
          next.time = (prev.time / prevDur) * (next.getClip().duration || 1)
        }
        next.fadeIn(FADE).play()
      }
      prev?.fadeOut(FADE)
      current.current = gait
    }
    // Scale the cadence with speed so feet keep pace between the walk and run reference speeds.
    const walk = actions.walk, run = actions.run
    if (walk) walk.timeScale = Math.max(0.65, Math.min(1.5, (speed / WALK_SPEED) * 1.12))
    if (run) run.timeScale = Math.max(0.85, Math.min(1.4, (speed / RUN_SPEED) * 1.08))

    // Procedural secondary motion: subtle turn banking, gentle slope pitch, and slight upward lift on lantern pulses.
    const tilt = tiltGroup.current
    if (tilt && dt > 0) {
      let targetBank = 0, targetPitch = 0
      if (speed > 0.35) {
        const heading = Math.atan2(velocity.x, velocity.z)
        if (prevHeading.current !== null) {
          const angVel = wrapPi(heading - prevHeading.current) / dt
          targetBank = Math.max(-0.13, Math.min(0.13, -angVel * 0.042 * Math.min(1, speed / RUN_SPEED)))
        }
        prevHeading.current = heading
        const dx = velocity.x / speed, dz = velocity.z / speed
        const slope = Math.atan2(heightAt(position.x + dx * 0.45, position.z + dz * 0.45) - heightAt(position.x - dx * 0.45, position.z - dz * 0.45), 0.9)
        targetPitch = Math.max(-0.09, Math.min(0.09, -slope * 0.45))
      } else {
        prevHeading.current = null
      }
      tilt.rotation.z += (targetBank - tilt.rotation.z) * dampFactor(10, dt)
      tilt.rotation.x += (targetPitch - tilt.rotation.x) * dampFactor(8, dt)
      const flare = resonance.lanternFlare
      const sq = hopState.squash * 0.085
      const sy = 1 + 0.035 * flare + sq
      const sxz = 1 - 0.015 * flare - sq * 0.5
      tilt.scale.set(sxz, sy, sxz)
    }
  })
  return <group ref={group}><group ref={tiltGroup}><primitive object={scene}/><Suspense fallback={null}><HandLantern character={scene}/></Suspense></group></group>
}
