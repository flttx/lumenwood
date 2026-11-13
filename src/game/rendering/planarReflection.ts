import { HalfFloatType, Matrix4, PerspectiveCamera, Plane, Vector2, Vector3, Vector4, WebGLRenderTarget, type Camera, type Object3D, type Scene, type WebGLRenderer } from 'three'
// Planar reflection for a horizontal water plane at height `level` (same math as three's Reflector, specialised to a
// fixed up-facing plane so the water can keep its own shader). The mirrored camera renders the scene into a reduced-size
// HDR target; the water samples it projectively through `textureMatrix`. Objects in `reflectionSkips` (the grass patch,
// which is costly and hidden by the shore anyway) are hidden for that render.
export const reflectionSkips = new Set<Object3D>()
const normal = new Vector3(0, 1, 0), clipBias = 0.003

export interface PlanarReflection {
  target: WebGLRenderTarget
  textureMatrix: Matrix4
  /** Renders the reflection for `camera`; `self` (the water mesh) is hidden meanwhile. */
  render: (renderer: WebGLRenderer, scene: Scene, camera: Camera, self: Object3D, scale: number) => void
  dispose: () => void
}

export function createPlanarReflection(level: number): PlanarReflection {
  const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
  const mirror = new PerspectiveCamera(), textureMatrix = new Matrix4()
  const planePoint = new Vector3(0, level, 0), cameraPos = new Vector3(), lookAt = new Vector3(), view = new Vector3(), aim = new Vector3()
  const rotation = new Matrix4(), plane = new Plane(), clip = new Vector4(), q = new Vector4(), size = new Vector2()
  const hidden: Object3D[] = []
  function render(renderer: WebGLRenderer, scene: Scene, camera: Camera, self: Object3D, scale: number) {
    cameraPos.setFromMatrixPosition(camera.matrixWorld)
    if (cameraPos.y <= level) return // below the surface: nothing sensible to mirror
    renderer.getDrawingBufferSize(size)
    const w = Math.max(1, Math.round(size.x * scale)), h = Math.max(1, Math.round(size.y * scale))
    if (target.width !== w || target.height !== h) target.setSize(w, h)
    view.subVectors(planePoint.set(cameraPos.x, level, cameraPos.z), cameraPos).reflect(normal).negate().add(planePoint)
    rotation.extractRotation(camera.matrixWorld)
    lookAt.set(0, 0, -1).applyMatrix4(rotation).add(cameraPos)
    aim.subVectors(planePoint, lookAt).reflect(normal).negate().add(planePoint)
    mirror.position.copy(view)
    mirror.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal)
    mirror.lookAt(aim)
    mirror.far = (camera as PerspectiveCamera).far
    mirror.updateMatrixWorld()
    mirror.projectionMatrix.copy(camera.projectionMatrix)
    mirror.projectionMatrix.elements[8] *= -1; mirror.projectionMatrix.elements[12] *= -1
    textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    textureMatrix.multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse)
    // Oblique near plane at the water surface, so nothing under the water shows in the mirror (Lengyel).
    plane.setFromNormalAndCoplanarPoint(normal, planePoint).applyMatrix4(mirror.matrixWorldInverse)
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant)
    const e = mirror.projectionMatrix.elements
    q.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14])
    clip.multiplyScalar(2 / clip.dot(q))
    e[2] = clip.x; e[6] = clip.y; e[10] = clip.z + 1 - clipBias; e[14] = clip.w
    self.visible = false
    for (const o of reflectionSkips) if (o.visible) { o.visible = false; hidden.push(o) }
    const previous = renderer.getRenderTarget(), shadows = renderer.shadowMap.autoUpdate
    renderer.shadowMap.autoUpdate = false
    renderer.setRenderTarget(target)
    renderer.state.buffers.depth.setMask(true)
    renderer.clear()
    renderer.render(scene, mirror)
    renderer.setRenderTarget(previous)
    renderer.shadowMap.autoUpdate = shadows
    for (const o of hidden) o.visible = true
    hidden.length = 0
    self.visible = true
  }
  return { target, textureMatrix, render, dispose: () => target.dispose() }
}
