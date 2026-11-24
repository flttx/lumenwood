import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { TimeSetting } from '../game/rendering/timeOfDay'
import type { NavigationHud } from '../game/features/route/navigation'
export type Quality = 'low' | 'medium' | 'high'
export type RegionId = 'camp' | 'wetland' | 'glade' | 'highland' | 'glen' | 'hollow' | 'lake' | 'overlook' | 'beach' | 'vale' | 'reef' | 'starcliff'
type Phase = 'title' | 'playing' | 'paused'
const QUALITIES: readonly Quality[] = ['low', 'medium', 'high']
const TIMES: readonly TimeSetting[] = ['journey', 'day', 'twilight', 'night']
const MAX_CAPTION_QUEUE = 4
const clampFinite = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback

export interface PersistedSettings { quality: Quality; volume: number; timeOfDay: TimeSetting; sensitivity: number; invertY: boolean }
export function sanitizeSettings(raw: unknown): Partial<PersistedSettings> {
  if (typeof raw !== 'object' || raw === null) return {}
  const d = raw as Record<string, unknown>, out: Partial<PersistedSettings> = {}
  if (QUALITIES.includes(d.quality as Quality)) out.quality = d.quality as Quality
  if (TIMES.includes(d.timeOfDay as TimeSetting)) out.timeOfDay = d.timeOfDay as TimeSetting
  if (typeof d.volume === 'number' && Number.isFinite(d.volume)) out.volume = Math.max(0, Math.min(1, d.volume))
  if (typeof d.sensitivity === 'number' && Number.isFinite(d.sensitivity)) out.sensitivity = Math.max(0.4, Math.min(2.5, d.sensitivity))
  if (typeof d.invertY === 'boolean') out.invertY = d.invertY
  return out
}

/** Safe localStorage adapter: catches private-mode / quota errors and skips unchanged writes during high-frequency HUD updates. */
export function createSafeStorage(backend?: () => Storage | null): StateStorage {
  let lastKey = '', lastValue = ''
  const getStore = () => { try { return backend ? backend() : window.localStorage } catch { return null } }
  return {
    getItem: (name) => { try { return getStore()?.getItem(name) ?? null } catch { return null } },
    setItem: (name, value) => {
      if (name === lastKey && value === lastValue) return
      try { getStore()?.setItem(name, value); lastKey = name; lastValue = value } catch { /* ignore quota / security errors */ }
    },
    removeItem: (name) => {
      if (name === lastKey) { lastKey = ''; lastValue = '' }
      try { getStore()?.removeItem(name) } catch { /* ignore */ }
    },
  }
}

interface GameState {
  phase: Phase; quality: Quality; volume: number; timeOfDay: TimeSetting; sensitivity: number; invertY: boolean
  pointerLocked: boolean; pausedAt: number; contextLost: boolean
  start: () => void; pause: () => void; resume: () => void; title: () => void
  setQuality: (quality: Quality) => void; setVolume: (volume: number) => void; setTimeOfDay: (timeOfDay: TimeSetting) => void
  setSensitivity: (sensitivity: number) => void; setInvertY: (invertY: boolean) => void
  setPointerLocked: (locked: boolean) => void; setContextLost: (lost: boolean) => void
  /** One-line guidance caption with FIFO queuing so rapid moments (seed memory + milestone) never clobber each other. */
  caption: { text: string; id: number } | null; captionQueue: string[]; showCaption: (text: string) => void; advanceCaption: (id: number) => void
  endingCard: boolean; setEndingCard: (shown: boolean) => void
  /** True once the world has mounted and warmed its shaders; the loading veil fades out on it. */
  worldReady: boolean; setWorldReady: (ready: boolean) => void
  /** Region-name banner (low-frequency: once per region entry); `visible` hides on animation end while keeping `name` for zone HUD. */
  region: { name: RegionId; id: number; visible: boolean } | null; showRegion: (name: RegionId) => void; clearRegion: (id: number) => void
  /** Lanterns lit so far and fireflies carried, for the HUD; written only when they change. */
  journey: { lit: number; total: number; carried: number; wetlandLit: number }; setJourney: (journey: { lit: number; total: number; carried: number; wetlandLit: number }) => void
  /** Light seeds found (HUD and ending card). */
  seeds: { found: number; total: number }; setSeeds: (seeds: { found: number; total: number }) => void
  objective: NavigationHud | null; setObjective: (objective: NavigationHud) => void
  sunlight: SunlightHud | null; setSunlight: (sunlight: SunlightHud | null) => void
  /** Low-frequency contextual world prompt (e.g., campfire hearth) and resonance summary. */
  prompt: string | null; setPrompt: (prompt: string | null) => void
  resonanceHud: { combo: number; secrets: number }; setResonanceHud: (hud: { combo: number; secrets: number }) => void
}
export interface SunlightHud { index: number; heading: number; growth: number; status: string; daylight: boolean; grown: boolean }
let nextCaptionId = 1
export const useGameStore = create<GameState>()(persist((set) => ({
  phase: 'title', quality: 'high', volume: 0.7, timeOfDay: 'journey', sensitivity: 1, invertY: false,
  pointerLocked: false, pausedAt: 0, contextLost: false,
  start: () => set({ phase: 'playing', contextLost: false }),
  pause: () => { try { document.exitPointerLock?.() } catch { /* ignore */ } set({ phase: 'paused', pausedAt: performance.now() }) },
  resume: () => set({ phase: 'playing' }),
  title: () => {
    try { document.exitPointerLock?.() } catch { /* ignore */ }
    set({
      phase: 'title', worldReady: false, region: null, caption: null, captionQueue: [], endingCard: false,
      objective: null, sunlight: null, prompt: null, resonanceHud: { combo: 0, secrets: 0 },
      journey: { lit: 0, total: 0, carried: 0, wetlandLit: 0 },
      seeds: { found: 0, total: 0 }, pointerLocked: false, contextLost: false,
    })
  },
  setQuality: (quality) => { if (QUALITIES.includes(quality)) set({ quality }) },
  setVolume: (volume) => set(s => ({ volume: clampFinite(volume, 0, 1, s.volume) })),
  setTimeOfDay: (timeOfDay) => { if (TIMES.includes(timeOfDay)) set({ timeOfDay }) },
  setSensitivity: (sensitivity) => set(s => ({ sensitivity: clampFinite(sensitivity, 0.4, 2.5, s.sensitivity) })),
  setInvertY: (invertY) => set({ invertY: Boolean(invertY) }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setContextLost: (contextLost) => set({ contextLost }),
  caption: null, captionQueue: [],
  showCaption: (text) => set(s => {
    if (!text) return s
    if (!s.caption) return { caption: { text, id: nextCaptionId++ } }
    if (s.caption.text === text || s.captionQueue[s.captionQueue.length - 1] === text) return s
    if (s.captionQueue.length >= MAX_CAPTION_QUEUE) return s
    return { captionQueue: [...s.captionQueue, text] }
  }),
  advanceCaption: (id) => set(s => {
    if (s.caption?.id !== id) return s
    if (s.captionQueue.length === 0) return { caption: null }
    const [next, ...rest] = s.captionQueue
    return { caption: { text: next, id: nextCaptionId++ }, captionQueue: rest }
  }),
  endingCard: false, setEndingCard: (endingCard) => set({ endingCard }),
  worldReady: false, setWorldReady: (worldReady) => set({ worldReady }),
  region: null,
  showRegion: (name) => set(s => ({ region: { name, id: (s.region?.id ?? 0) + 1, visible: true } })),
  clearRegion: (id) => set(s => (s.region?.id === id ? { region: { ...s.region, visible: false } } : s)),
  journey: { lit: 0, total: 0, carried: 0, wetlandLit: 0 }, setJourney: (journey) => set({ journey }),
  seeds: { found: 0, total: 0 }, setSeeds: (seeds) => set({ seeds }),
  objective: null, setObjective: (objective) => set({ objective }),
  sunlight: null, setSunlight: (sunlight) => set({ sunlight }),
  prompt: null, setPrompt: (prompt) => set({ prompt }),
  resonanceHud: { combo: 0, secrets: 0 }, setResonanceHud: (resonanceHud) => set({ resonanceHud }),
}), {
  name: 'lumenwood-settings-v1',
  storage: createJSONStorage(() => createSafeStorage()),
  partialize: ({ quality, volume, timeOfDay, sensitivity, invertY }) => ({ quality, volume, timeOfDay, sensitivity, invertY }),
  // Whitelist persisted fields on hydration so corrupt/tampered storage never breaks runtime invariants or overwrites actions.
  merge: (persisted, current) => ({ ...current, ...sanitizeSettings(persisted) }),
  // v1 stored a fixed time; the journey's own sunset is the new default, so earlier saves start from it once.
  version: 2,
  migrate: (state, version) => (version < 2 && typeof state === 'object' && state !== null ? { ...(state as Record<string, unknown>), timeOfDay: 'journey' } : state) as GameState,
}))
