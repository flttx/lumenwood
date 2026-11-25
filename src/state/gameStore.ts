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

export interface PersistedSettings {
  quality: Quality
  volume: number
  ambienceVolume: number
  musicVolume: number
  sfxVolume: number
  timeOfDay: TimeSetting
  sensitivity: number
  invertY: boolean
  dragOnly: boolean
  powerSave: boolean
  scenicIdle: boolean
}
export function sanitizeSettings(raw: unknown): Partial<PersistedSettings> {
  if (typeof raw !== 'object' || raw === null) return {}
  const d = raw as Record<string, unknown>, out: Partial<PersistedSettings> = {}
  if (QUALITIES.includes(d.quality as Quality)) out.quality = d.quality as Quality
  if (TIMES.includes(d.timeOfDay as TimeSetting)) out.timeOfDay = d.timeOfDay as TimeSetting
  if (typeof d.volume === 'number' && Number.isFinite(d.volume)) out.volume = Math.max(0, Math.min(1, d.volume))
  if (typeof d.ambienceVolume === 'number' && Number.isFinite(d.ambienceVolume)) out.ambienceVolume = Math.max(0, Math.min(1, d.ambienceVolume))
  if (typeof d.musicVolume === 'number' && Number.isFinite(d.musicVolume)) out.musicVolume = Math.max(0, Math.min(1, d.musicVolume))
  if (typeof d.sfxVolume === 'number' && Number.isFinite(d.sfxVolume)) out.sfxVolume = Math.max(0, Math.min(1, d.sfxVolume))
  if (typeof d.sensitivity === 'number' && Number.isFinite(d.sensitivity)) out.sensitivity = Math.max(0.4, Math.min(2.5, d.sensitivity))
  if (typeof d.invertY === 'boolean') out.invertY = d.invertY
  if (typeof d.dragOnly === 'boolean') out.dragOnly = d.dragOnly
  if (typeof d.powerSave === 'boolean') out.powerSave = d.powerSave
  if (typeof d.scenicIdle === 'boolean') out.scenicIdle = d.scenicIdle
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
  phase: Phase; quality: Quality; volume: number; lastVolume: number
  ambienceVolume: number; musicVolume: number; sfxVolume: number
  timeOfDay: TimeSetting; sensitivity: number; invertY: boolean
  dragOnly: boolean; powerSave: boolean; scenicIdle: boolean
  pointerLocked: boolean; pausedAt: number; contextLost: boolean
  journalOpen: boolean; autoWalk: boolean; visitedRegions: RegionId[]
  start: () => void; pause: () => void; resume: () => void; title: () => void
  setQuality: (quality: Quality) => void; setVolume: (volume: number) => void; toggleMute: () => number
  setAmbienceVolume: (volume: number) => void; setMusicVolume: (volume: number) => void; setSfxVolume: (volume: number) => void
  setTimeOfDay: (timeOfDay: TimeSetting) => void
  setSensitivity: (sensitivity: number) => void; setInvertY: (invertY: boolean) => void
  setDragOnly: (dragOnly: boolean) => void; setPowerSave: (powerSave: boolean) => void; setScenicIdle: (scenicIdle: boolean) => void
  setPointerLocked: (locked: boolean) => void; setContextLost: (lost: boolean) => void
  setJournalOpen: (open: boolean) => void; setAutoWalk: (autoWalk: boolean) => void
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
  resonanceHud: { combo: number; secrets: number; flow: number }; setResonanceHud: (hud: { combo: number; secrets: number; flow: number }) => void
}
export interface SunlightHud { index: number; heading: number; growth: number; status: string; daylight: boolean; grown: boolean }
let nextCaptionId = 1
export const useGameStore = create<GameState>()(persist((set, get) => ({
  phase: 'title', quality: 'high', volume: 0.7, lastVolume: 0.7,
  ambienceVolume: 1, musicVolume: 1, sfxVolume: 1,
  timeOfDay: 'journey', sensitivity: 1, invertY: false,
  dragOnly: false, powerSave: false, scenicIdle: false,
  pointerLocked: false, pausedAt: 0, contextLost: false,
  journalOpen: false, autoWalk: false, visitedRegions: ['camp'],
  start: () => set({ phase: 'playing', contextLost: false, journalOpen: false, autoWalk: false }),
  pause: () => { try { document.exitPointerLock?.() } catch { /* ignore */ } set({ phase: 'paused', pausedAt: performance.now(), journalOpen: false, autoWalk: false }) },
  resume: () => set({ phase: 'playing', journalOpen: false }),
  title: () => {
    try { document.exitPointerLock?.() } catch { /* ignore */ }
    set({
      phase: 'title', worldReady: false, region: null, caption: null, captionQueue: [], endingCard: false,
      objective: null, sunlight: null, prompt: null, resonanceHud: { combo: 0, secrets: 0, flow: 0 },
      journey: { lit: 0, total: 0, carried: 0, wetlandLit: 0 },
      seeds: { found: 0, total: 0 }, pointerLocked: false, contextLost: false,
      journalOpen: false, autoWalk: false, visitedRegions: ['camp'],
    })
  },
  setQuality: (quality) => { if (QUALITIES.includes(quality)) set({ quality }) },
  setVolume: (volume) => set(s => {
    const next = clampFinite(volume, 0, 1, s.volume)
    return { volume: next, lastVolume: next > 0 ? next : s.lastVolume }
  }),
  toggleMute: () => {
    const s = get()
    const next = s.volume > 0 ? 0 : (s.lastVolume > 0 ? s.lastVolume : 0.7)
    set({ volume: next, lastVolume: next > 0 ? next : s.lastVolume })
    return next
  },
  setAmbienceVolume: (volume) => set(s => ({ ambienceVolume: clampFinite(volume, 0, 1, s.ambienceVolume) })),
  setMusicVolume: (volume) => set(s => ({ musicVolume: clampFinite(volume, 0, 1, s.musicVolume) })),
  setSfxVolume: (volume) => set(s => ({ sfxVolume: clampFinite(volume, 0, 1, s.sfxVolume) })),
  setTimeOfDay: (timeOfDay) => { if (TIMES.includes(timeOfDay)) set({ timeOfDay }) },
  setSensitivity: (sensitivity) => set(s => ({ sensitivity: clampFinite(sensitivity, 0.4, 2.5, s.sensitivity) })),
  setInvertY: (invertY) => set({ invertY: Boolean(invertY) }),
  setDragOnly: (dragOnly) => {
    const next = Boolean(dragOnly)
    if (next) { try { document.exitPointerLock?.() } catch { /* ignore */ } }
    set({ dragOnly: next })
  },
  setPowerSave: (powerSave) => set({ powerSave: Boolean(powerSave) }),
  setScenicIdle: (scenicIdle) => set({ scenicIdle: Boolean(scenicIdle) }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setContextLost: (contextLost) => set({ contextLost }),
  setJournalOpen: (open) => {
    const next = Boolean(open)
    if (next) { try { document.exitPointerLock?.() } catch { /* ignore */ } }
    set({ journalOpen: next, autoWalk: false })
  },
  setAutoWalk: (autoWalk) => set({ autoWalk: Boolean(autoWalk) }),
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
  showRegion: (name) => set(s => ({
    region: { name, id: (s.region?.id ?? 0) + 1, visible: true },
    visitedRegions: s.visitedRegions.includes(name) ? s.visitedRegions : [...s.visitedRegions, name],
  })),
  clearRegion: (id) => set(s => (s.region?.id === id ? { region: { ...s.region, visible: false } } : s)),
  journey: { lit: 0, total: 0, carried: 0, wetlandLit: 0 }, setJourney: (journey) => set({ journey }),
  seeds: { found: 0, total: 0 }, setSeeds: (seeds) => set({ seeds }),
  objective: null, setObjective: (objective) => set({ objective }),
  sunlight: null, setSunlight: (sunlight) => set({ sunlight }),
  prompt: null, setPrompt: (prompt) => set({ prompt }),
  resonanceHud: { combo: 0, secrets: 0, flow: 0 }, setResonanceHud: (resonanceHud) => set({ resonanceHud }),
}), {
  name: 'lumenwood-settings-v1',
  storage: createJSONStorage(() => createSafeStorage()),
  partialize: ({ quality, volume, ambienceVolume, musicVolume, sfxVolume, timeOfDay, sensitivity, invertY, dragOnly, powerSave, scenicIdle }) =>
    ({ quality, volume, ambienceVolume, musicVolume, sfxVolume, timeOfDay, sensitivity, invertY, dragOnly, powerSave, scenicIdle }),
  // Whitelist persisted fields on hydration so corrupt/tampered storage never breaks runtime invariants or overwrites actions.
  merge: (persisted, current) => {
    const clean = sanitizeSettings(persisted)
    return { ...current, ...clean, lastVolume: typeof clean.volume === 'number' && clean.volume > 0 ? clean.volume : current.lastVolume }
  },
  // v1 stored a fixed time; the journey's own sunset is the new default, so earlier saves start from it once.
  version: 2,
  migrate: (state, version) => (version < 2 && typeof state === 'object' && state !== null ? { ...(state as Record<string, unknown>), timeOfDay: 'journey' } : state) as GameState,
}))
