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
import { Water } from './zones/Water'
import { wetlandFireflyHomes } from '../features/firefly/swarm'
import { useGameStore } from '../../state/gameStore'
import { Precompile } from '../rendering/Precompile'
import { Grass, trailTarget } from '../rendering/Grass'
import { AirEffects } from '../rendering/AirEffects'
import { PostFX } from '../rendering/PostFX'
import { LocalLights } from '../rendering/LocalLights'
import { AmbientLife } from '../features/ambient/AmbientLife'
import { spawnPoint } from '../features/route/save'
export function World() {
  const input = useMemo(() => createInput(), [])
  // A continued journey starts where it was saved; a new one at the camp spawn.
  const position = useMemo(() => { const at = spawnPoint.position; spawnPoint.position = null; return at ? new Vector3(at[0], 0, at[1]) : new Vector3() }, [])
  const velocity = useMemo(() => new Vector3(), [])
  const rig = useMemo<CameraRig>(() => ({ distance: CAMERA_DISTANCE }), [])
  // The grass tramples around the player; share the same position vector (updated in place by Player).
  trailTarget.position = position
  const gl = useThree(s => s.gl)
  const element = gl.domElement
  useEffect(() => attachInput(input, element, () => useGameStore.getState().phase === 'playing'), [element, input])
  useEffect(() => attachFocusGuards(element), [element])
  useEffect(() => installDebugApi({ input, position, velocity, rig, gl }), [input, position, velocity, rig, gl])
  return <><Atmosphere player={position}/><LocalLights/>
    <Forest/><Grass/><AirEffects/><AmbientLife/><Suspense fallback={null}><GlowFlowers player={position}/></Suspense><Fireflies/><Fireflies homes={wetlandFireflyHomes} seed={13}/><Water player={position} velocity={velocity}/><FireflyRoute player={position}/><Player input={input} position={position} velocity={velocity}/><FollowCamera input={input} position={position} rig={rig}/><SoundscapeDriver/><Precompile/><PostFX/>
  </>
}
