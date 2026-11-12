import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
// Compiles every material in the scene up front (hidden ones too: the route stream, light bridge and finale column), so
// a shader is never first compiled mid-play when it comes into view — that showed up as a ~50 ms frame in the perf
// baseline once the wetland water was added. A second pass catches models that finish loading after the first.
const SECOND_PASS_MS = 1500
export function Precompile() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    // If async compilation is unsupported or fails, shaders simply compile on first draw as before.
    const run = () => gl.compileAsync(scene, camera).catch(() => gl.info.reset())
    run()
    const timer = window.setTimeout(run, SECOND_PASS_MS)
    return () => window.clearTimeout(timer)
  }, [gl, scene, camera])
  return null
}
