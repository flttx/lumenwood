import { requestLock } from './focus'
import { useGameStore } from '../../state/gameStore'
export interface InputState { keys: Set<string>; yaw: number; pitch: number }
export function createInput(): InputState { return { keys: new Set(), yaw: 0, pitch: 0.28 } }
const MAX_MOUSE_DELTA = 150
export const MIN_PITCH = -0.78, MAX_PITCH = 0.9

export function attachInput(input: InputState, element: HTMLElement, isPlaying: () => boolean) {
  let dragging = false, dragged = false, lastX = 0, lastY = 0
  const applyLook = (dx: number, dy: number) => {
    const { sensitivity, invertY } = useGameStore.getState()
    const scale = 0.0025 * sensitivity
    const cx = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, dx))
    const cy = Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, dy))
    input.yaw -= cx * scale
    input.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, input.pitch + cy * scale * (invertY ? -1 : 1)))
  }
  const down = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (isPlaying()) input.keys.add(e.code)
  }
  const up = (e: KeyboardEvent) => { input.keys.delete(e.code) }
  const clear = () => { input.keys.clear(); dragging = false; dragged = false }
  const mouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || !isPlaying() || document.pointerLockElement === element) return
    dragging = true; dragged = false; lastX = e.clientX; lastY = e.clientY
  }
  const mouseUp = () => { dragging = false }
  const mouse = (e: MouseEvent) => {
    if (!isPlaying()) return
    if (document.pointerLockElement === element) {
      applyLook(e.movementX, e.movementY)
    } else if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true
      lastX = e.clientX; lastY = e.clientY
      applyLook(dx, dy)
    }
  }
  const click = () => {
    if (dragged) { dragged = false; return }
    if (isPlaying()) requestLock(element)
  }
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear)
  window.addEventListener('mouseup', mouseUp)
  element.addEventListener('mousedown', mouseDown); document.addEventListener('mousemove', mouse); element.addEventListener('click', click)
  return () => {
    window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear)
    window.removeEventListener('mouseup', mouseUp)
    element.removeEventListener('mousedown', mouseDown); document.removeEventListener('mousemove', mouse); element.removeEventListener('click', click)
    clear()
  }
}
