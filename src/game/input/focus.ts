import { useGameStore } from '../../state/gameStore'
function pauseIfPlaying() { const state = useGameStore.getState(); if (state.phase === 'playing') state.pause() }
/** Requests pointer lock; a refusal (e.g. browser cooldown after Esc) just leaves the "click to look" hint visible. */
export function requestLock(element: Element | null) {
  if (!element || document.pointerLockElement === element) return
  Promise.resolve(element.requestPointerLock()).catch(() => useGameStore.getState().setPointerLocked(false))
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
  const visibility = () => { if (document.hidden) pauseIfPlaying() }
  window.addEventListener('blur', pauseIfPlaying); document.addEventListener('visibilitychange', visibility); document.addEventListener('pointerlockchange', lockChange)
  return () => { window.removeEventListener('blur', pauseIfPlaying); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('pointerlockchange', lockChange) }
}
