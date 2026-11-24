import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, PointLight, Vector3 } from 'three'
import { useGameStore } from '../../state/gameStore'
import { qualitySettings } from './config'
import { smoothstep } from '../shared/math'
// Real light from lanterns, cradles and flowers (2026-11-12; replaces flat additive "pools" that floated over the rolling
// ground and left hard edges). Owners register sources and update `level` each frame; a fixed handful of point lights
// (no shadows) follows the sources nearest the camera. The light count never changes during play, so no shader recompiles;
// a light leaving a source fades out before taking the next one, and far sources fade by distance, so nothing pops.
export interface LightSource { position: Vector3; color: Color; /** candela at level 1 */ intensity: number; range: number; level: number }
export const lightSources = new Set<LightSource>()
export function lightSource(position: [number, number, number], color: number, intensity: number, range: number): LightSource {
  return { position: new Vector3(...position), color: new Color(color), intensity, range, level: 0 }
}
const FADE_NEAR = 18, FADE_FAR = 32, SWAP_RATE = 4
interface Slot { light: PointLight; source: LightSource | null; mix: number }

export function LocalLights() {
  const count = useGameStore(s => qualitySettings[s.quality].localLights)
  const slots = useMemo<Slot[]>(() => Array.from({ length: count }, () => ({ light: new PointLight(0xffffff, 0, 1, 2), source: null, mix: 0 })), [count])
  // Pre-allocated top-K scratch buffers avoid allocating 5 arrays + ~45 objects every frame.
  const top = useMemo(() => ({ sources: new Array<LightSource | null>(count).fill(null), weights: new Float32Array(count) }), [count])
  useFrame(({ camera }, delta) => {
    const reach = (s: LightSource) => s.level * (1 - smoothstep(FADE_NEAR, FADE_FAR, s.position.distanceTo(camera.position)))
    top.sources.fill(null); top.weights.fill(0.01)
    for (const s of lightSources) {
      const w = reach(s)
      if (w <= 0.01) continue
      let minIdx = 0
      for (let i = 1; i < count; i++) if (top.weights[i] < top.weights[minIdx]) minIdx = i
      if (w > top.weights[minIdx]) { top.weights[minIdx] = w; top.sources[minIdx] = s }
    }
    const isWanted = (s: LightSource) => {
      for (let i = 0; i < count; i++) if (top.sources[i] === s) return true
      return false
    }
    const step = Math.min(delta, 0.1) * SWAP_RATE
    for (const slot of slots) {
      if (slot.source && !lightSources.has(slot.source)) slot.source = null
      if (slot.source) slot.mix = isWanted(slot.source) ? Math.min(1, slot.mix + step) : Math.max(0, slot.mix - step)
      if (slot.source && slot.mix === 0 && !isWanted(slot.source)) slot.source = null
    }
    for (let i = 0; i < count; i++) {
      const source = top.sources[i]
      if (!source || slots.some(slot => slot.source === source)) continue
      const free = slots.find(slot => slot.source === null)
      if (!free) break
      free.source = source; free.mix = 0
    }
    for (const { light, source, mix } of slots) {
      if (!source) { light.intensity = 0; continue }
      light.position.copy(source.position); light.color.copy(source.color); light.distance = source.range
      light.intensity = source.intensity * reach(source) * mix
    }
  })
  return <>{slots.map((slot, i) => <primitive key={i} object={slot.light}/>)}</>
}
