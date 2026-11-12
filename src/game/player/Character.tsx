import { Suspense, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import type { Group, Vector3 } from 'three'
import { assetConfig } from '../assets/config'
import { RUN_SPEED, WALK_SPEED } from './movement'
import { gaitFor } from './gait'
import { HandLantern } from './HandLantern'
// CHR-001 (docs/ASSET_MANIFEST.md): one skinned mesh with in-place idle / walk / run clips; facing +Z like the player group.
const CHARACTER_URL = `${assetConfig.baseUrl}models/character/CHR-001.glb`
const FADE = 0.25
useGLTF.preload(CHARACTER_URL, false, false)

export function Character({ velocity }: { velocity: Vector3 }) {
  const group = useRef<Group>(null)
  const { scene, animations } = useGLTF(CHARACTER_URL, false, false)
  const { actions } = useAnimations(animations, group)
  const current = useRef('idle')
  useEffect(() => { actions.idle?.reset().play() }, [actions])
  useEffect(() => scene.traverse(o => { o.castShadow = true }), [scene])
  useFrame(() => {
    const speed = Math.hypot(velocity.x, velocity.z), gait = gaitFor(speed, current.current)
    if (gait !== current.current) {
      actions[gait]?.reset().fadeIn(FADE).play()
      actions[current.current]?.fadeOut(FADE)
      current.current = gait
    }
    // Scale the cadence with speed so feet keep pace between the walk and run reference speeds.
    const walk = actions.walk, run = actions.run
    if (walk) walk.timeScale = Math.max(0.6, Math.min(1.4, speed / WALK_SPEED))
    if (run) run.timeScale = Math.max(0.8, Math.min(1.3, speed / RUN_SPEED))
  })
  return <group ref={group}><primitive object={scene}/><Suspense fallback={null}><HandLantern character={scene}/></Suspense></group>
}
