import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { soundscape } from '../../audio/engine'
import { campfire } from '../../world/zones/campLayout'
import { heightAt } from '../../world/terrain/terrain'
import { SECRET_IDS, markActivity, route } from '../route/progress'
import { memories } from '../secrets/secrets'
import { seeds } from '../../world/zones/sideLayout'
import { resonance } from '../resonance/resonance'

const HEARTH_REACH = 3.4
const HEARTH_PROMPT = '营地火光 · 按 E 听种子的回声'

/**
 * Interactive camp hearth anchor: standing by the campfire outside the cabin lets the player press E
 * to warm the embers and replay the forest memories gathered from Light Seeds alongside side-secret progress.
 */
export function HearthDirector({ player }: { player: Vector3 }) {
  const nearRef = useRef(false)
  const cursorRef = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const store = useGameStore.getState()
      if (store.phase !== 'playing' || store.endingCard || store.contextLost || !nearRef.current) return
      markActivity()
      resonance.hearthFlare = 1
      soundscape.cue('hearth', campfire.x, heightAt(campfire.x, campfire.z) + 1.0, campfire.z)
      const found = route.seedsAt.size
      if (found === 0) {
        store.showCaption('火光正暖。去日光镜和林间山口找找光之种子吧。')
        return
      }
      const totalLines = Math.min(found, memories.length) + 1
      const step = cursorRef.current % totalLines
      cursorRef.current = (step + 1) % totalLines
      if (step < Math.min(found, memories.length)) {
        store.showCaption(memories[step])
      } else {
        store.showCaption(`已寻得 ${found}/${seeds.length} 颗种子 · 秘密已解开 ${route.secretsAt.size}/${SECRET_IDS.length}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (nearRef.current) {
        nearRef.current = false
        const store = useGameStore.getState()
        if (store.prompt === HEARTH_PROMPT) store.setPrompt(null)
      }
    }
  }, [])

  useFrame(() => {
    const store = useGameStore.getState()
    const near = store.phase === 'playing' && !store.endingCard && Math.hypot(player.x - campfire.x, player.z - campfire.z) <= HEARTH_REACH
    if (near !== nearRef.current) {
      nearRef.current = near
      store.setPrompt(near ? HEARTH_PROMPT : store.prompt === HEARTH_PROMPT ? null : store.prompt)
    }
  })

  return null
}
