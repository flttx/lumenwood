import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Sprite, SpriteMaterial } from 'three'
import { radialGlowTexture } from '../flora/glowSprites'
import { routeClock } from './progress'
import { hint } from './RouteDirector'
// Stall hint: a soft column of light rises over the next target for a few seconds, together with a chime from its
// direction (RouteDirector). Seen across the zone, but brief and gentle rather than an arrow or marker.
const DURATION = 3.5
export function HintPulse() {
  const { sprite, material } = useMemo(() => {
    const material = new SpriteMaterial({ map: radialGlowTexture(), color: 0xfff0c8, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false })
    const sprite = new Sprite(material)
    sprite.scale.set(1.6, 10, 1); sprite.visible = false
    return { sprite, material }
  }, [])
  useFrame(() => {
    const t = (routeClock.now - hint.at) / DURATION
    sprite.visible = t >= 0 && t < 1
    if (!sprite.visible) return
    sprite.position.set(hint.x, hint.y + 5, hint.z)
    material.opacity = 0.7 * Math.sin(Math.PI * t)
  })
  return <primitive object={sprite}/>
}
