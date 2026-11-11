import { Suspense, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { createInput, attachInput } from '../input/input'
import { attachFocusGuards } from '../input/focus'
import { Player } from '../player/Player'
import { CAMERA_DISTANCE, FollowCamera, type CameraRig } from '../camera/FollowCamera'
import { installDebugApi } from '../debug/debugApi'
import { Forest } from './zones/Forest'
import { GlowFlowers } from '../features/flora/GlowFlowers'
import { Atmosphere } from '../rendering/Atmosphere'
import { Fireflies } from '../features/firefly/Fireflies'
import { SoundscapeDriver } from '../audio/SoundscapeDriver'
import { FireflyRoute } from '../features/route/FireflyRoute'
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
  return <><Atmosphere player={position}/>
    <Forest/><Suspense fallback={null}><GlowFlowers player={position}/></Suspense><Fireflies/><FireflyRoute player={position}/><Player input={input} position={position} velocity={velocity}/><FollowCamera input={input} position={position} rig={rig}/><SoundscapeDriver/>
  </>
}
