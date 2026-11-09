import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { createInput, attachInput } from '../input/input'
import { attachFocusGuards } from '../input/focus'
import { Player } from '../player/Player'
import { CAMERA_DISTANCE, FollowCamera, type CameraRig } from '../camera/FollowCamera'
import { installDebugApi } from '../debug/debugApi'
import { Forest } from './zones/Forest'
import { useGameStore } from '../../state/gameStore'
export function World() {
  const input = useMemo(() => createInput(), [])
  const position = useMemo(() => new Vector3(), [])
  const velocity = useMemo(() => new Vector3(), [])
  const rig = useMemo<CameraRig>(() => ({ distance: CAMERA_DISTANCE }), [])
  const gl = useThree(s => s.gl)
  const element = gl.domElement
  useEffect(() => attachInput(input, element, () => useGameStore.getState().phase === 'playing'), [element, input])
  useEffect(() => attachFocusGuards(element), [element])
  useEffect(() => installDebugApi({ input, position, velocity, rig, gl }), [input, position, velocity, rig, gl])
  return <><color attach="background" args={['#a5b9aa']}/><fog attach="fog" args={['#a5b9aa', 24, 65]}/>
    <hemisphereLight args={['#e7f4e5', '#596b4c', 2]}/><directionalLight position={[8, 15, 5]} intensity={2}/>
    <Forest/><Player input={input} position={position} velocity={velocity}/><FollowCamera input={input} position={position} rig={rig}/>
  </>
}
