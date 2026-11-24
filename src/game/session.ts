import { soundscape } from './audio/engine'
import { resetCameraMoment } from './camera/FollowCamera'
import { conduit, createConduit } from './features/route/conduit'
import { flock } from './features/route/flock'
import { navigationFocus } from './features/route/navigation'
import { activityClock, resetProgress, route, routeClock } from './features/route/progress'
import { resetHint } from './features/route/RouteDirector'
import { resetResonance } from './features/resonance/resonance'
import { livePose, saveRequest, spawnPoint } from './features/route/save'
import { resetSecretFx } from './features/secrets/fx'
import { createSecretState } from './features/secrets/secrets'
import { secretSession } from './features/secrets/session'
import { resetAtmosphere } from './rendering/timeOfDay'
import { resetWind } from './rendering/wind'
import { gates } from './world/regions'

/**
 * Resets all module-level frame-loop singletons between journeys so a new or continued session
 * never inherits stale night lighting, camera moments, gates, audio layers, or puzzle states.
 */
export function resetSessionState(clearProgress = false) {
  if (clearProgress) resetProgress(route)
  routeClock.now = 0
  activityClock.at = 0
  flock.clear()
  gates.north = false; gates.bridge = false; gates.ascent = false
  resetAtmosphere()
  resetWind()
  resetCameraMoment()
  resetHint()
  resetResonance()
  resetSecretFx()
  secretSession.state = createSecretState()
  navigationFocus.target = null
  Object.assign(conduit, createConduit())
  saveRequest.dirty = false
  spawnPoint.position = null; spawnPoint.view = null
  livePose.position = null; livePose.view = null
  soundscape.resetSession()
}
