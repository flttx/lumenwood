import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Euler, Mesh, MeshStandardMaterial, Quaternion, Sprite, SpriteMaterial, Vector3, type Group, type Object3D, type WebGLProgramParametersWithUniforms } from 'three'
import { assetConfig } from '../assets/config'
import { atmosphere } from '../rendering/timeOfDay'
import { lightSource, lightSources } from '../rendering/LocalLights'
import { radialGlowTexture } from '../features/flora/glowSprites'
import { dampFactor } from './movement'
import { lanternBoost } from '../features/secrets/secrets'
import { route } from '../features/route/progress'
// PRP-008: the lamplighter's hand lantern (concept boards show the character carrying it). It hangs from CHR-001's right
// hand bone but stays upright, swinging like a pendulum as the hand moves. The candle is a real light after dusk
// (LocalLights) with a soft halo; by day only the flame glows. Meshy gave no emission map, so the shader lights the
// texels that are bright and unsaturated (the glass panes and candle) and leaves the bronze frame and wooden base alone.
const LANTERN_URL = `${assetConfig.baseUrl}models/props/PRP-008.glb`
useGLTF.preload(LANTERN_URL, false, false)
// The carrying ring sits HANG metres below the hand's origin; the flame FLAME metres above the lantern's base.
// Pendulum: natural frequency² (1/s²), how strongly the hand's acceleration kicks it, damping rate and tilt limit (rad).
const HANG = 0.3, FLAME = 0.12, STIFFNESS = 30, KICK = 0.08, DAMPING = 2.5, MAX_TILT = 0.5
// The light sits OUTWARD metres beyond the lantern (away from the body) and a little above it: right at the glass it
// blew out the character's legs.
const LIGHT_COLOR = 0xffb562, CANDELA = 1.6, RANGE = 9, HALO_SIZE = 0.6, OUTWARD = 0.45, LIFT = 0.25

export function HandLantern({ character }: { character: Object3D }) {
  const group = useRef<Group>(null)
  const { scene } = useGLTF(LANTERN_URL, false, false)
  const parts = useMemo(() => {
    const hand = character.getObjectByName('RightHand')
    if (!hand) throw new Error('CHR-001 has no RightHand bone')
    const model = scene.clone()
    model.traverse(o => { if (o instanceof Mesh) { o.castShadow = true; if (o.material instanceof MeshStandardMaterial) o.material = o.material.clone() } })
    const halo = new Sprite(new SpriteMaterial({ map: radialGlowTexture(), color: LIGHT_COLOR, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false }))
    halo.scale.setScalar(HALO_SIZE); halo.position.y = FLAME
    model.add(halo)
    model.position.y = -HANG
    const glow = { value: 0 }
    model.traverse(o => {
      if (!(o instanceof Mesh) || !(o.material instanceof MeshStandardMaterial)) return
      o.material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uGlow = glow
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
uniform float uGlow;`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  float sat = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
  float pane = smoothstep(0.32, 0.55, lum) * (1.0 - smoothstep(0.1, 0.3, sat));
  totalEmissiveRadiance += vec3(1.0, 0.68, 0.32) * pane * uGlow;`)
      }
      o.material.customProgramCacheKey = () => 'lumenwood-hand-lantern'
    })
    return { hand, model, halo, glow, source: lightSource([0, 0, 0], LIGHT_COLOR, CANDELA, RANGE),
      world: new Vector3(), local: new Vector3(), last: new Vector3(), velocity: new Vector3(), tilt: { x: 0, z: 0, vx: 0, vz: 0 },
      euler: new Euler(), swing: new Quaternion(), primed: false }
  }, [character, scene])
  useEffect(() => { lightSources.add(parts.source); return () => { lightSources.delete(parts.source) } }, [parts])
  useFrame(({ clock }, delta) => {
    const g = group.current, parent = g?.parent
    if (!g || !parent) return
    const dt = Math.min(delta, 0.1), { hand, world, local, last, velocity, tilt, euler, swing } = parts
    if (dt <= 0) return
    hand.getWorldPosition(world)
    if (!parts.primed) { last.copy(world); parts.primed = true }
    // Pendulum in world axes: the hand's acceleration swings the lantern the other way; a damped spring settles it.
    const vx = (world.x - last.x) / dt, vz = (world.z - last.z) / dt, ax = (vx - velocity.x) / dt, az = (vz - velocity.z) / dt
    velocity.set(vx, 0, vz); last.copy(world)
    const damp = dampFactor(DAMPING, dt)
    tilt.vx += (-STIFFNESS * tilt.x + KICK * az) * dt; tilt.vz += (-STIFFNESS * tilt.z - KICK * ax) * dt
    tilt.vx -= tilt.vx * damp; tilt.vz -= tilt.vz * damp
    tilt.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt.x + tilt.vx * dt)); tilt.z = Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt.z + tilt.vz * dt))
    local.copy(world); parent.worldToLocal(local)
    g.position.copy(local) // the pivot is the hand; the model hangs HANG below it
    // World-space swing expressed in the parent's frame, so the lantern hangs plumb however the player turns.
    swing.setFromEuler(euler.set(tilt.x, 0, tilt.z))
    parent.getWorldQuaternion(g.quaternion).invert().multiply(swing)
    // The flame: steady glow by day, a flickering real light and halo after dusk.
    const night = atmosphere.blend, flicker = 0.88 + 0.08 * Math.sin(clock.elapsedTime * 13.1) + 0.04 * Math.sin(clock.elapsedTime * 29.7)
    parts.glow.value = (0.4 + 1.1 * night) * flicker
    parts.halo.material.opacity = (0.1 + 0.4 * night) * flicker
    const light = parts.source.position
    parts.halo.getWorldPosition(light); parent.getWorldPosition(parts.local)
    const ox = light.x - parts.local.x, oz = light.z - parts.local.z, len = Math.hypot(ox, oz) || 1
    light.set(light.x + (ox / len) * OUTWARD, light.y + LIFT, light.z + (oz / len) * OUTWARD)
    // Each light seed found makes the lantern a little brighter (features/secrets).
    parts.source.level = night * flicker * lanternBoost(route.seedsAt.size)
  })
  return <group ref={group}><primitive object={parts.model}/></group>
}
