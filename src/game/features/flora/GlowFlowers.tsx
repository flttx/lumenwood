import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Sprite, SpriteMaterial, type Vector3 } from 'three'
import { assetConfig } from '../../assets/config'
import { flowers as flowerSpots } from '../../world/zones/floraLayout'
import { dampFactor } from '../../player/movement'
import { GLOW_BASE, GLOW_PEAK, WAVE_FLASH, glowTarget, lightWave, nextAwake } from './glow'
import { radialGlowTexture, softRing } from './glowSprites'
import { atmosphere } from '../../rendering/timeOfDay'
import { soundscape } from '../../audio/engine'
import { releaseFirefly, route } from '../route/progress'
import { flock } from '../route/flock'
import { heightAt } from '../../world/terrain/terrain'
// INT-001 interactive flowers. Each copy owns its material so its glow can react on its own; the geometry is shared.
// Waking a flower sends a procedural light ring across the ground and plays a spatial chime from its position.
// After dusk a halo at the flower head and a pool of light on the ground stand in for bloom and real light spill.
const FLOWER_URL = `${assetConfig.baseUrl}models/interactive/INT-001.glb`
const GLOW_RATE = 3
// Provisional, tuned by eye: pale mint for the wave, warm cream (the emission map's petal colour) for the light.
const WAVE_COLOR = 0xc6f2d6, HALO_COLOR = 0xffe7b8, POOL_COLOR = 0xffd9a0
const HALO_HEIGHT = 0.5, HALO_SIZE = 1.5, HALO_OPACITY = 0.55, POOL_SIZE = 3.6, POOL_OPACITY = 0.5
const CHIME_HEIGHT = 0.5
useGLTF.preload(FLOWER_URL, false, false)

export function GlowFlowers({ player }: { player: Vector3 }) {
  const { scene } = useGLTF(FLOWER_URL, false, false)
  const flowers = useMemo(() => {
    const source = scene.getObjectByName('INT-001')
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error(`${FLOWER_URL} has no standard mesh named INT-001`)
    const geometry = source.geometry, base = source.material
    const ringGeometry = softRing(), poolGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), glowMap = radialGlowTexture()
    // No scene fog on additive glows: fog would add fog colour across the whole quad and show its edges in thick mist.
    const additive = { transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false } as const
    return flowerSpots.map((spot, index) => {
      const material = base.clone()
      material.emissiveIntensity = GLOW_BASE
      const ringMaterial = new MeshBasicMaterial({ ...additive, color: WAVE_COLOR, vertexColors: true }), ring = new Mesh(ringGeometry, ringMaterial)
      const haloMaterial = new SpriteMaterial({ ...additive, color: HALO_COLOR, map: glowMap }), halo = new Sprite(haloMaterial)
      const poolMaterial = new MeshBasicMaterial({ ...additive, color: POOL_COLOR, map: glowMap }), pool = new Mesh(poolGeometry, poolMaterial)
      ring.visible = halo.visible = pool.visible = false
      halo.scale.setScalar(HALO_SIZE); pool.scale.setScalar(POOL_SIZE)
      return { ...spot, y: heightAt(spot.x, spot.z), index, mesh: new Mesh(geometry, material), material, ring, ringMaterial, halo, haloMaterial, pool, poolMaterial, awake: false, age: Infinity, level: GLOW_BASE }
    })
  }, [scene])
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1), k = dampFactor(GLOW_RATE, dt)
    // Twilight multiplies the glow so the flowers read as light sources once the sun is down.
    const { flowerGlow, flowerHalo } = atmosphere.preset
    for (const f of flowers) {
      const distance = Math.hypot(player.x - f.x, player.z - f.z), awake = nextAwake(f.awake, distance)
      if (awake && !f.awake) {
        f.age = 0; soundscape.chime(f.index, f.x, CHIME_HEIGHT, f.z)
        // The first waking also frees a guide firefly that joins the player (the firefly route, P3).
        if (releaseFirefly(route, f.index)) flock.spawn(f.x, HALO_HEIGHT, f.z)
      }
      f.awake = awake
      const wave = lightWave(f.age)
      f.age += dt
      f.ring.visible = wave !== null
      if (wave) { f.ring.scale.setScalar(Math.max(wave.radius, 0.01)); f.ringMaterial.opacity = wave.opacity * 0.9 }
      f.level += (glowTarget(distance) + WAVE_FLASH * (wave?.opacity ?? 0) - f.level) * k
      f.material.emissiveIntensity = f.level * flowerGlow
      // Resting flowers keep a faint light so they can be spotted from afar; approaching brightens them fully.
      const light = flowerHalo * (0.4 + 0.6 * Math.min(1, f.level / GLOW_PEAK))
      f.halo.visible = f.pool.visible = light > 0.01
      f.haloMaterial.opacity = light * HALO_OPACITY; f.poolMaterial.opacity = light * POOL_OPACITY
    }
  })
  return <>{flowers.map(f => <group key={`${f.x},${f.z}`} position={[f.x, 0, f.z]}>
    <primitive object={f.mesh} position={[0, f.y, 0]} rotation={[0, f.angle, 0]}/><primitive object={f.ring} position={[0, 0.04, 0]}/>
    <primitive object={f.pool} position={[0, 0.03, 0]}/><primitive object={f.halo} position={[0, HALO_HEIGHT, 0]}/>
  </group>)}</>
}
