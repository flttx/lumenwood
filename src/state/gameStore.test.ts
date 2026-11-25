import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSafeStorage, sanitizeSettings, useGameStore } from './gameStore'

describe('gameStore hardening and HUD queues', () => {
  beforeEach(() => {
    useGameStore.getState().title()
  })

  it('sanitizes persisted settings and rejects malformed, NaN, or unexpected keys', () => {
    expect(sanitizeSettings(null)).toEqual({})
    expect(sanitizeSettings('corrupt')).toEqual({})
    expect(sanitizeSettings({
      quality: 'ultra',
      timeOfDay: 'midnight',
      volume: Number.NaN,
      sensitivity: Infinity,
      invertY: 'yes',
      phase: 'playing',
      start: 'injected',
    })).toEqual({})
    expect(sanitizeSettings({
      quality: 'medium',
      timeOfDay: 'day',
      volume: 1.8,
      ambienceVolume: -0.5,
      musicVolume: 0.4,
      sfxVolume: 2.2,
      sensitivity: 0.1,
      invertY: true,
      dragOnly: true,
      powerSave: true,
      scenicIdle: true,
    })).toEqual({
      quality: 'medium',
      timeOfDay: 'day',
      volume: 1,
      ambienceVolume: 0,
      musicVolume: 0.4,
      sfxVolume: 1,
      sensitivity: 0.4,
      invertY: true,
      dragOnly: true,
      powerSave: true,
      scenicIdle: true,
    })
  })

  it('toggles mute cleanly while preserving last non-zero volume, tracks visited regions, and clears journal/autoWalk on pause or title', () => {
    const store = useGameStore.getState()
    store.setVolume(0.55)
    expect(store.toggleMute()).toBe(0)
    expect(useGameStore.getState().volume).toBe(0)
    expect(store.toggleMute()).toBeCloseTo(0.55)
    expect(useGameStore.getState().volume).toBeCloseTo(0.55)

    store.start()
    store.setAutoWalk(true)
    store.setJournalOpen(true)
    expect(useGameStore.getState().journalOpen).toBe(true)
    expect(useGameStore.getState().autoWalk).toBe(false)

    store.showRegion('glen')
    store.showRegion('glen')
    expect(useGameStore.getState().visitedRegions).toEqual(['camp', 'glen'])

    store.pause()
    expect(useGameStore.getState().journalOpen).toBe(false)
    expect(useGameStore.getState().autoWalk).toBe(false)
  })

  it('wraps storage errors safely and deduplicates identical writes', () => {
    const writes = vi.fn()
    const memory = new Map<string, string>()
    const fake = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => { writes(k, v); memory.set(k, v) },
      removeItem: (k: string) => { memory.delete(k) },
    } as unknown as Storage
    const storage = createSafeStorage(() => fake)
    storage.setItem('k', 'v1')
    storage.setItem('k', 'v1')
    storage.setItem('k', 'v2')
    expect(writes).toHaveBeenCalledTimes(2)
    expect(storage.getItem('k')).toBe('v2')

    const throwing = createSafeStorage(() => { throw new Error('SecurityError') })
    expect(throwing.getItem('k')).toBeNull()
    expect(() => throwing.setItem('k', 'v')).not.toThrow()
    expect(() => throwing.removeItem('k')).not.toThrow()
  })

  it('queues captions FIFO with deduplication, keeps region name after banner hides, and resets transient state on title()', () => {
    const store = useGameStore.getState()
    store.showCaption('first')
    store.showCaption('first') // duplicate of active caption ignored
    store.showCaption('second')
    store.showCaption('second') // duplicate of queue tail ignored
    store.showCaption('third')
    expect(useGameStore.getState().caption?.text).toBe('first')
    expect(useGameStore.getState().captionQueue).toEqual(['second', 'third'])

    const firstId = useGameStore.getState().caption!.id
    store.advanceCaption(firstId + 999) // stale id ignored
    expect(useGameStore.getState().caption?.text).toBe('first')

    store.advanceCaption(firstId)
    expect(useGameStore.getState().caption?.text).toBe('second')
    store.advanceCaption(useGameStore.getState().caption!.id)
    expect(useGameStore.getState().caption?.text).toBe('third')
    store.advanceCaption(useGameStore.getState().caption!.id)
    expect(useGameStore.getState().caption).toBeNull()

    store.showRegion('wetland')
    const regionId = useGameStore.getState().region!.id
    expect(useGameStore.getState().region).toMatchObject({ name: 'wetland', visible: true })
    store.clearRegion(regionId)
    expect(useGameStore.getState().region).toMatchObject({ name: 'wetland', visible: false })

    store.setEndingCard(true)
    store.setContextLost(true)
    store.title()
    const reset = useGameStore.getState()
    expect(reset.phase).toBe('title')
    expect(reset.region).toBeNull()
    expect(reset.caption).toBeNull()
    expect(reset.captionQueue).toEqual([])
    expect(reset.endingCard).toBe(false)
    expect(reset.contextLost).toBe(false)
  })
})
