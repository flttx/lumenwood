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
import { WATER_AREAS, Water } from './zones/Water'
import { Waterfall } from './zones/Waterfall'
import { Sea } from './zones/Sea'
import { SideFeatures } from '../features/secrets/SideFeatures'
import { Seeds } from '../features/secrets/Seeds'
import { SecretsDirector } from '../features/secrets/SecretsDirector'
import { Beacon } from '../features/route/Beacon'
import { wetlandFireflyHomes } from '../features/firefly/swarm'
import { useGameStore } from '../../state/gameStore'
import { Precompile } from '../rendering/Precompile'
import { Grass, trailTarget } from '../rendering/Grass'
import { AirEffects } from '../rendering/AirEffects'
import { PostFX } from '../rendering/PostFX'
import { LocalLights } from '../rendering/LocalLights'
import { AmbientLife } from '../features/ambient/AmbientLife'
import { flushLiveSave, livePose, spawnPoint } from '../features/route/save'
import { Sunlight } from '../features/sunlight/Sunlight'
import { ConduitDirector } from '../features/route/ConduitDirector'
import { ResonanceDirector } from '../features/resonance/ResonanceDirector'
import { WetlandRelay } from '../features/resonance/WetlandRelay'
import { ResonanceArcs } from '../features/secrets/ResonanceArcs'
import { HearthDirector } from '../features/campfire/HearthDirector'
import { heightAt } from './terrain/terrain'
import { deckHeight } from './zones/sceneryLayout'
import { sunlightDeckHeight } from '../features/sunlight/layout'
import { route } from '../features/route/progress'
import { bridgeDeck, onBridge } from './regions'
export function World() {
  // Pure initialization: never mutate spawnPoint inside useMemo so StrictMode / Suspense retries preserve restored poses.
  const input = useMemo(() => {
    const state = createInput()
    if (spawnPoint.view) { state.yaw = spawnPoint.view[0]; state.pitch = spawnPoint.view[1] }
    return state
  }, [])
  const position = useMemo(() => {
    const at = spawnPoint.position
    const x = at ? at[0] : 0, z = at ? at[1] : 0
    const sunBridge = sunlightDeckHeight(x, z, route.sunlight.grownAt !== null)
    const y = onBridge(x, z) ? bridgeDeck(z) : Math.max(heightAt(x, z), deckHeight(x, z), sunBridge)
    return new Vector3(x, y, z)
  }, [])
  const velocity = useMemo(() => new Vector3(), [])
  const rig = useMemo<CameraRig>(() => ({ distance: CAMERA_DISTANCE }), [])
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene)
  const element = gl.domElement
  useEffect(() => {
    trailTarget.position = position
    livePose.position = [position.x, position.z]
    livePose.view = [input.yaw, input.pitch]
    const onHide = () => {
      if (useGameStore.getState().phase !== 'title') {
        livePose.position = [position.x, position.z]
        livePose.view = [input.yaw, input.pitch]
        flushLiveSave(route, true)
      }
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      const store = useGameStore.getState()
      store.setContextLost(true)
      if (store.phase === 'playing') store.pause()
    }
    const onContextRestored = () => { useGameStore.getState().setContextLost(false) }
    window.addEventListener('pagehide', onHide)
    element.addEventListener('webglcontextlost', onContextLost, false)
    element.addEventListener('webglcontextrestored', onContextRestored, false)
    return () => {
      window.removeEventListener('pagehide', onHide)
      element.removeEventListener('webglcontextlost', onContextLost)
      element.removeEventListener('webglcontextrestored', onContextRestored)
    }
  }, [element, input, position])
  useEffect(() => attachInput(input, element, () => {
    const s = useGameStore.getState()
    return s.phase === 'playing' && !s.journalOpen && !s.endingCard && !s.contextLost
  }), [element, input])
  useEffect(() => attachFocusGuards(element), [element])
  useEffect(() => installDebugApi({ input, position, velocity, rig, gl, scene }), [input, position, velocity, rig, gl, scene])
  return <>
    <Player input={input} position={position} velocity={velocity}/>
    <FollowCamera input={input} position={position} velocity={velocity} rig={rig}/>
    <Atmosphere player={position}/><LocalLights/>
    <ConduitDirector player={position} input={input}/>
    <ResonanceDirector player={position}/>
    <WetlandRelay player={position}/>
    <ResonanceArcs/>
    <HearthDirector player={position}/>
    <Suspense fallback={null}><Sunlight player={position}/></Suspense>
    <Forest/><Grass/><AirEffects/><AmbientLife/><Suspense fallback={null}><GlowFlowers player={position}/></Suspense><Fireflies/><Fireflies homes={wetlandFireflyHomes} seed={13}/><Water player={position} velocity={velocity}/><Water player={position} velocity={velocity} area={WATER_AREAS.glen}/><Waterfall/><Sea/><Suspense fallback={null}><SideFeatures/></Suspense><Seeds/><SecretsDirector player={position}/><Beacon/><FireflyRoute player={position}/><SoundscapeDriver/><Precompile/><PostFX/>
  </>
}
