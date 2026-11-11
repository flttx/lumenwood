import { Suspense } from 'react'
import type { Vector3 } from 'three'
import { RouteDirector } from './RouteDirector'
import { Lanterns } from './Lanterns'
import { RouteParticles } from './RouteParticles'
import { GateMist } from './GateMist'
/** The firefly route (P3): rules, lantern posts, guide fireflies, the stream and the gate mist. */
export function FireflyRoute({ player }: { player: Vector3 }) {
  return <><RouteDirector player={player}/><Suspense fallback={null}><Lanterns/></Suspense><RouteParticles/><GateMist/></>
}
