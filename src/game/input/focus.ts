import { useGameStore } from '../../state/gameStore'
function pauseIfPlaying() {
  const state = useGameStore.getState()
  // Ending card intentionally releases pointer lock while keeping climax music & crown animation alive.
  if (state.phase === 'playing' && !state.endingCard) state.pause()
}
/** Requests pointer lock safely across browsers; refusals or missing support leave the "click to look" hint visible. */
export function requestLock(element: Element | null) {
  if (!element || document.pointerLockElement === element || typeof element.requestPointerLock !== 'function') return
  try {
    Promise.resolve(element.requestPointerLock()).catch(() => useGameStore.getState().setPointerLocked(false))
  } catch {
    useGameStore.getState().setPointerLocked(false)
  }
}
/** Pauses when the window loses focus, the tab is hidden, or pointer lock is released while playing. */
export function attachFocusGuards(element: HTMLElement) {
  let wasLocked = document.pointerLockElement === element
  const lockChange = () => {
    const locked = document.pointerLockElement === element
    useGameStore.getState().setPointerLocked(locked)
    if (wasLocked && !locked) pauseIfPlaying()
    wasLocked = locked
  }
  const lockError = () => useGameStore.getState().setPointerLocked(false)
  const visibility = () => { if (document.hidden) pauseIfPlaying() }
  window.addEventListener('blur', pauseIfPlaying)
  document.addEventListener('visibilitychange', visibility)
  document.addEventListener('pointerlockchange', lockChange)
  document.addEventListener('pointerlockerror', lockError)
  return () => {
    window.removeEventListener('blur', pauseIfPlaying)
    document.removeEventListener('visibilitychange', visibility)
    document.removeEventListener('pointerlockchange', lockChange)
    document.removeEventListener('pointerlockerror', lockError)
  }
}
