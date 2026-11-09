import { create } from 'zustand'
import { persist } from 'zustand/middleware'
export type Quality = 'low' | 'medium' | 'high'
type Phase = 'title' | 'playing' | 'paused'
interface GameState {
  phase: Phase; quality: Quality; volume: number; pointerLocked: boolean; pausedAt: number
  start: () => void; pause: () => void; resume: () => void; title: () => void
  setQuality: (quality: Quality) => void; setVolume: (volume: number) => void; setPointerLocked: (locked: boolean) => void
}
export const useGameStore = create<GameState>()(persist((set) => ({
  phase: 'title', quality: 'high', volume: 0.7, pointerLocked: false, pausedAt: 0,
  start: () => set({ phase: 'playing' }), pause: () => { document.exitPointerLock?.(); set({ phase: 'paused', pausedAt: performance.now() }) },
  resume: () => set({ phase: 'playing' }), title: () => { document.exitPointerLock?.(); set({ phase: 'title' }) },
  setQuality: (quality) => set({ quality }), setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
}), { name: 'lumenwood-settings-v1', partialize: ({ quality, volume }) => ({ quality, volume }) }))
