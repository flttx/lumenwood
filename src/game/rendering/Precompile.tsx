import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useGameStore } from '../../state/gameStore'
// Compiles every material in the scene up front (hidden ones too: the route stream, light bridge and finale column), so
// a shader is never first compiled mid-play when it comes into view — that showed up as a ~50 ms frame in the perf
// baseline once the wetland water was added. A second pass catches models that finish loading after the first.
// The loading veil stays up until the first pass is done and a few frames have been drawn, so the player never sees
// the first, slow frames.
const SECOND_PASS_MS = 1500, SETTLE_FRAMES = 6
export function Precompile() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    // If async compilation is unsupported or fails, shaders simply compile on first draw as before.
    const run = () => gl.compileAsync(scene, camera).catch(() => gl.info.reset())
    let frame = 0, cancelled = false
    const settle = () => { if (cancelled) return; if (++frame >= SETTLE_FRAMES) useGameStore.getState().setWorldReady(true); else requestAnimationFrame(settle) }
    void run().then(() => requestAnimationFrame(settle))
    const timer = window.setTimeout(run, SECOND_PASS_MS)
    return () => { cancelled = true; window.clearTimeout(timer); useGameStore.getState().setWorldReady(false) }
  }, [gl, scene, camera])
  return null
}
