import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimeOfDay } from '../game/rendering/timeOfDay'
export type Quality = 'low' | 'medium' | 'high'
export type RegionId = 'camp' | 'wetland' | 'glade' | 'highland'
type Phase = 'title' | 'playing' | 'paused'
interface GameState {
  phase: Phase; quality: Quality; volume: number; timeOfDay: TimeOfDay; pointerLocked: boolean; pausedAt: number
  start: () => void; pause: () => void; resume: () => void; title: () => void
  setQuality: (quality: Quality) => void; setVolume: (volume: number) => void; setTimeOfDay: (timeOfDay: TimeOfDay) => void
  setPointerLocked: (locked: boolean) => void
  /** One-line guidance caption (low-frequency: a handful per journey); `id` restarts its fade when the text repeats. */
  caption: { text: string; id: number } | null; showCaption: (text: string) => void
  endingCard: boolean; setEndingCard: (shown: boolean) => void
  /** True once the world has mounted and warmed its shaders; the loading veil fades out on it. */
  worldReady: boolean; setWorldReady: (ready: boolean) => void
  /** Region-name banner (low-frequency: once per region entry); `id` restarts its animation. */
  region: { name: RegionId; id: number } | null; showRegion: (name: RegionId) => void
  /** Lanterns lit so far and fireflies carried, for the HUD; written only when they change. */
  journey: { lit: number; total: number; carried: number }; setJourney: (journey: { lit: number; total: number; carried: number }) => void
}
export const useGameStore = create<GameState>()(persist((set) => ({
  phase: 'title', quality: 'high', volume: 0.7, timeOfDay: 'day', pointerLocked: false, pausedAt: 0,
  start: () => set({ phase: 'playing' }), pause: () => { document.exitPointerLock?.(); set({ phase: 'paused', pausedAt: performance.now() }) },
  resume: () => set({ phase: 'playing' }), title: () => { document.exitPointerLock?.(); set({ phase: 'title', worldReady: false, region: null }) },
  setQuality: (quality) => set({ quality }), setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }), setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  caption: null, showCaption: (text) => set(s => ({ caption: { text, id: (s.caption?.id ?? 0) + 1 } })),
  endingCard: false, setEndingCard: (endingCard) => set({ endingCard }),
  worldReady: false, setWorldReady: (worldReady) => set({ worldReady }),
  region: null, showRegion: (name) => set(s => ({ region: { name, id: (s.region?.id ?? 0) + 1 } })),
  journey: { lit: 0, total: 0, carried: 0 }, setJourney: (journey) => set({ journey }),
}), { name: 'lumenwood-settings-v1', partialize: ({ quality, volume, timeOfDay }) => ({ quality, volume, timeOfDay }) }))
