import { requestLock } from './focus'
export interface InputState { keys: Set<string>; yaw: number; pitch: number }
export function createInput(): InputState { return { keys: new Set(), yaw: 0, pitch: 0.28 } }
export function attachInput(input: InputState, element: HTMLElement, isPlaying: () => boolean) {
  const down = (e: KeyboardEvent) => { if (isPlaying()) input.keys.add(e.code) }
  const up = (e: KeyboardEvent) => { input.keys.delete(e.code) }
  const clear = () => input.keys.clear()
  const mouse = (e: MouseEvent) => { if (isPlaying() && document.pointerLockElement === element) { input.yaw -= e.movementX * 0.0025; input.pitch = Math.max(-0.15, Math.min(0.9, input.pitch + e.movementY * 0.0025)) } }
  const click = () => { if (isPlaying()) requestLock(element) }
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear)
  document.addEventListener('mousemove', mouse); element.addEventListener('click', click)
  return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('mousemove', mouse); element.removeEventListener('click', click); clear() }
}
