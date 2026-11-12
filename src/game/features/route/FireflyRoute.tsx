import { Suspense } from 'react'
import { ASCENT, NORTH_CORRIDOR } from '../../world/regions'
import { route } from './progress'
import type { MistArea } from './GateMist'
import type { Vector3 } from 'three'
import { RouteDirector } from './RouteDirector'
import { Lanterns } from './Lanterns'
import { RouteParticles } from './RouteParticles'
import { GateMist } from './GateMist'
import { LightBridge } from './LightBridge'
import { HintPulse } from './HintPulse'
// Mist sits in the mouth of each gated passage: the corridor out of the camp, the ramp out of the glade.
const corridorMist: MistArea = { minX: NORTH_CORRIDOR.minX, maxX: NORTH_CORRIDOR.maxX, minZ: 22.4, maxZ: 27, seed: 47 }
const ascentMist: MistArea = { minX: ASCENT.minX, maxX: ASCENT.maxX, minZ: 75.5, maxZ: 80, seed: 53 }
const campDone = () => route.completedAt.camp, finaleDone = () => route.finaleAt
/** The firefly route: rules, light nodes, guide fireflies, streams, the gate mists and the light bridge. */
export function FireflyRoute({ player }: { player: Vector3 }) {
  return <><RouteDirector player={player}/><Suspense fallback={null}><Lanterns kind="post"/><Lanterns kind="cradle"/></Suspense><RouteParticles/><GateMist area={corridorMist} clearsFrom={campDone}/><GateMist area={ascentMist} clearsFrom={finaleDone}/><LightBridge/><HintPulse/></>
}
