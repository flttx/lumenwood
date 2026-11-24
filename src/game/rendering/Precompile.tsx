import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { HalfFloatType, WebGLRenderTarget } from 'three'
import { useGameStore } from '../../state/gameStore'
// Compiles every material in the scene up front against an offscreen linear HDR render target matching PostFX's
// sceneTarget (compiling to the screen framebuffer would use ACES + sRGB cache keys and miss on frame 1).
const SECOND_PASS_MS = 1500, SETTLE_FRAMES = 6
export function Precompile() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const dummy = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
    const run = async () => {
      const previous = gl.getRenderTarget()
      gl.setRenderTarget(dummy)
      try { await gl.compileAsync(scene, camera) } catch { gl.info.reset() }
      finally { gl.setRenderTarget(previous) }
    }
    let frame = 0, cancelled = false
    const settle = () => { if (cancelled) return; if (++frame >= SETTLE_FRAMES) useGameStore.getState().setWorldReady(true); else requestAnimationFrame(settle) }
    void run().then(() => { if (!cancelled) requestAnimationFrame(settle) })
    const timer = window.setTimeout(() => { if (!cancelled) void run() }, SECOND_PASS_MS)
    return () => { cancelled = true; window.clearTimeout(timer); dummy.dispose(); useGameStore.getState().setWorldReady(false) }
  }, [gl, scene, camera])
  return null
}
