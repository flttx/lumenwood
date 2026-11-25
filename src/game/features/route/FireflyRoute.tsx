import { Suspense } from 'react'
import { ASCENT, EAST_RIDGE_TRAIL, GLEN, GLEN_LAKE_TRAIL, HOLLOW, HOLLOW_VALE_TRAIL, NORTH_CORRIDOR, VALE } from '../../world/regions'
import { route } from './progress'
import { sz } from '../../world/scale'
import type { MistArea } from './GateMist'
import type { Vector3 } from 'three'
import { RouteDirector } from './RouteDirector'
import { Lanterns } from './Lanterns'
import { RouteParticles } from './RouteParticles'
import { GateMist } from './GateMist'
import { LightBridge } from './LightBridge'
import { HintPulse } from './HintPulse'
import { RouteGuidance } from './RouteGuidance'
// Mist sits in the mouth of each gated passage: the corridor out of the camp, the ramp out of the glade, and the gated side loops.
const corridorMist: MistArea = { minX: NORTH_CORRIDOR.minX, maxX: NORTH_CORRIDOR.maxX, minZ: sz(22.1), maxZ: sz(25.8), seed: 47 }
const ascentMist: MistArea = { minX: ASCENT.minX, maxX: ASCENT.maxX, minZ: sz(75.1), maxZ: sz(78.5), seed: 53 }
const glenLoopMist: MistArea = { minX: GLEN_LAKE_TRAIL.minX, maxX: GLEN_LAKE_TRAIL.maxX, minZ: GLEN.maxZ - 0.5, maxZ: GLEN.maxZ + 4.2, seed: 59 }
const hollowLoopMist: MistArea = { minX: HOLLOW_VALE_TRAIL.minX, maxX: HOLLOW_VALE_TRAIL.maxX, minZ: HOLLOW.maxZ - 0.5, maxZ: HOLLOW.maxZ + 4.2, seed: 61 }
const eastRidgeMist: MistArea = { minX: EAST_RIDGE_TRAIL.minX, maxX: EAST_RIDGE_TRAIL.maxX, minZ: VALE.maxZ - 0.5, maxZ: VALE.maxZ + 4.2, seed: 67 }
const campDone = () => route.completedAt.camp, finaleDone = () => route.finaleAt
/** The firefly route: rules, light nodes, guide fireflies, streams, the gate mists and the light bridge. */
export function FireflyRoute({ player }: { player: Vector3 }) {
  return <>
    <RouteDirector player={player}/><RouteGuidance player={player}/>
    <Suspense fallback={null}><Lanterns kind="post"/><Lanterns kind="cradle"/></Suspense>
    <RouteParticles/>
    <GateMist area={corridorMist} clearsFrom={campDone}/>
    <GateMist area={glenLoopMist} clearsFrom={campDone}/>
    <GateMist area={hollowLoopMist} clearsFrom={campDone}/>
    <GateMist area={ascentMist} clearsFrom={finaleDone}/>
    <GateMist area={eastRidgeMist} clearsFrom={finaleDone}/>
    <LightBridge/><HintPulse/>
  </>
}
