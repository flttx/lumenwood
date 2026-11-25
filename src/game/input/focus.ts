import { useGameStore } from '../../state/gameStore'
function pauseIfPlaying() {
  const state = useGameStore.getState()
  // Ending card intentionally releases pointer lock while keeping climax music & crown animation alive.
  if (state.phase === 'playing' && !state.endingCard) state.pause()
}
function pauseOnBlurOrHide() {
  const state = useGameStore.getState()
  // Optional office-worker scenic idle mode keeps forest ambience running softly when alt-tabbing away.
  if (state.scenicIdle) return
  pauseIfPlaying()
}
/** Requests pointer lock safely across browsers; refusals or missing support leave the "click to look" hint visible. */
export function requestLock(element: Element | null) {
  if (!element || useGameStore.getState().dragOnly || document.pointerLockElement === element || typeof element.requestPointerLock !== 'function') return
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
    if (wasLocked && !locked && !useGameStore.getState().journalOpen && !useGameStore.getState().dragOnly) pauseIfPlaying()
    wasLocked = locked
  }
  const lockError = () => useGameStore.getState().setPointerLocked(false)
  const visibility = () => { if (document.hidden) pauseOnBlurOrHide() }
  window.addEventListener('blur', pauseOnBlurOrHide)
  document.addEventListener('visibilitychange', visibility)
  document.addEventListener('pointerlockchange', lockChange)
  document.addEventListener('pointerlockerror', lockError)
  return () => {
    window.removeEventListener('blur', pauseOnBlurOrHide)
    document.removeEventListener('visibilitychange', visibility)
    document.removeEventListener('pointerlockchange', lockChange)
    document.removeEventListener('pointerlockerror', lockError)
  }
}
