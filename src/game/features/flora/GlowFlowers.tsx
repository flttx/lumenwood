import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, Sprite, SpriteMaterial, type Vector3 } from 'three'
import { assetConfig } from '../../assets/config'
import { flowers as flowerSpots } from '../../world/zones/floraLayout'
import { dampFactor } from '../../player/movement'
import { GLOW_BASE, GLOW_PEAK, WAVE_FLASH, glowTarget, lightWave, nextAwake } from './glow'
import { radialGlowTexture, softRing } from './glowSprites'
import { atmosphere } from '../../rendering/timeOfDay'
import { soundscape } from '../../audio/engine'
import { releaseFirefly, route, routeClock } from '../route/progress'
import { flock } from '../route/flock'
import { heightAt } from '../../world/terrain/terrain'
import { lightSource, lightSources } from '../../rendering/LocalLights'
import { createMoteMaterial } from '../route/moteMaterial'
import { random } from '../../shared/random'
// INT-004 glow lilies (replaced the small INT-001 bell flowers, 2026-11-12). Each copy owns its material so its glow can
// react on its own; the geometry is shared. Waking a flower sends a light ring across the ground, a burst of sparks spiralling
// up out of the blossoms and a little bloom of the plant, and plays a spatial chime from its position. Flowers that still
// hold a firefly breathe softly so they can be picked out from a distance.
// After dusk each flower is a small real light source (LocalLights; hung above the head so the grass right beside it does not
// blow out) with a faint halo at its head; bloom does the glare.
const FLOWER_ID = 'INT-004', FLOWER_URL = `${assetConfig.baseUrl}models/interactive/${FLOWER_ID}.glb`
const GLOW_RATE = 3
// Provisional, tuned by eye: pale mint for the wave, warm cream (the emission map's petal colour) for the light.
const WAVE_COLOR = 0xc6f2d6, HALO_COLOR = 0xffe7b8, LIGHT_COLOR = 0xffd9a0
const HALO_HEIGHT = 0.85, HALO_SIZE = 1.7, HALO_OPACITY = 0.35, LIGHT_CANDELA = 1.8, LIGHT_RANGE = 6.5, LIGHT_HEIGHT = 1.5
const CHIME_HEIGHT = 0.8
// Wake burst: sparks per flower, how long they live and how high they climb; the plant swells by POP at the wake.
const SPARKS = 22, SPARK_LIFE = 2.6, SPARK_RISE = 2.8, POP = 0.08
useGLTF.preload(FLOWER_URL, false, false)

export function GlowFlowers({ player }: { player: Vector3 }) {
  const { scene } = useGLTF(FLOWER_URL, false, false)
  const dpr = useThree(s => s.viewport.dpr)
  const sparks = useMemo(() => {
    const geometry = new BufferGeometry(), count = flowerSpots.length * SPARKS, rand = random(57)
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(count), 1))
    // Per spark: start angle, radius, speed and delay.
    const seeds = Array.from({ length: count }, () => [rand() * Math.PI * 2, 0.15 + rand() * 0.45, 0.6 + rand() * 0.6, rand() * 0.5])
    return { geometry, material: createMoteMaterial(0xffe1b0), seeds }
  }, [])
  useEffect(() => () => { sparks.geometry.dispose(); sparks.material.dispose() }, [sparks])
  const flowers = useMemo(() => {
    const source = scene.getObjectByName(FLOWER_ID)
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error(`${FLOWER_URL} has no standard mesh named ${FLOWER_ID}`)
    const geometry = source.geometry, base = source.material
    const ringGeometry = softRing(), glowMap = radialGlowTexture()
    // No scene fog on additive glows: fog would add fog colour across the whole quad and show its edges in thick mist.
    const additive = { transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false } as const
    return flowerSpots.map((spot, index) => {
      const material = base.clone()
      material.emissiveIntensity = GLOW_BASE
      const ringMaterial = new MeshBasicMaterial({ ...additive, color: WAVE_COLOR, vertexColors: true }), ring = new Mesh(ringGeometry, ringMaterial)
      const haloMaterial = new SpriteMaterial({ ...additive, color: HALO_COLOR, map: glowMap }), halo = new Sprite(haloMaterial)
      ring.visible = halo.visible = false
      halo.scale.setScalar(HALO_SIZE)
      const y = heightAt(spot.x, spot.z), source = lightSource([spot.x, y + LIGHT_HEIGHT, spot.z], LIGHT_COLOR, LIGHT_CANDELA, LIGHT_RANGE)
      return { ...spot, y, index, mesh: new Mesh(geometry, material), material, ring, ringMaterial, halo, haloMaterial, source, awake: false, age: Infinity, level: GLOW_BASE }
    })
  }, [scene])
  useEffect(() => {
    flowers.forEach(f => lightSources.add(f.source))
    return () => flowers.forEach(f => lightSources.delete(f.source))
  }, [flowers])
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1), k = dampFactor(GLOW_RATE, dt), t = clock.elapsedTime
    // Twilight multiplies the glow so the flowers read as light sources once the sun is down.
    const { flowerGlow, flowerHalo } = atmosphere.preset
    const sp = sparks.geometry.attributes.position as BufferAttribute, sa = sparks.geometry.attributes.aAlpha as BufferAttribute
    sparks.material.uniforms.uTime.value = t; sparks.material.uniforms.uSize.value = 70 * dpr
    sparks.material.uniforms.uOpacity.value = 0.6 + 0.4 * atmosphere.preset.fireflies
    for (const f of flowers) {
      const distance = Math.hypot(player.x - f.x, player.z - f.z), awake = nextAwake(f.awake, distance)
      if (awake && !f.awake) {
        f.age = 0; soundscape.chime(f.index, f.x, f.y + CHIME_HEIGHT, f.z)
        // The first waking also frees a guide firefly that joins the player (the firefly route, P3).
        if (releaseFirefly(route, f.index, routeClock.now)) flock.spawn(f.x, f.y + HALO_HEIGHT, f.z)
      }
      f.awake = awake
      const wave = lightWave(f.age)
      f.age += dt
      f.ring.visible = wave !== null
      if (wave) { f.ring.scale.setScalar(Math.max(wave.radius, 0.01)); f.ringMaterial.opacity = wave.opacity * 0.9 }
      f.level += (glowTarget(distance) + WAVE_FLASH * (wave?.opacity ?? 0) - f.level) * k
      f.material.emissiveIntensity = f.level * flowerGlow
      // Bloom: a quick swell and settle at the wake.
      f.mesh.scale.setScalar(1 + POP * Math.sin(Math.min(1, f.age / 0.9) * Math.PI) * Math.exp(-f.age))
      for (let i = 0; i < SPARKS; i++) {
        const [angle, radius, speed, delay] = sparks.seeds[f.index * SPARKS + i], life = (f.age - delay) / SPARK_LIFE, n = f.index * SPARKS + i
        if (!(life >= 0 && life < 1)) { sa.setX(n, 0); continue }
        const a = angle + life * 5 * speed, r = radius * (1 + life * 1.6), h = HALO_HEIGHT + SPARK_RISE * speed * (1 - (1 - life) ** 2)
        sp.setXYZ(n, f.x + Math.cos(a) * r, f.y + h, f.z + Math.sin(a) * r); sa.setX(n, Math.min(1, life * 8) * (1 - life))
      }
      // Resting flowers keep a faint light so they can be spotted from afar; one still holding its firefly breathes.
      const waiting = !route.released.has(f.index), breathe = waiting ? 0.75 + 0.25 * Math.sin(t * 2.1 + f.index) : 1
      const light = flowerHalo * breathe * (0.4 + 0.6 * Math.min(1, f.level / GLOW_PEAK))
      f.halo.visible = light > 0.01
      f.haloMaterial.opacity = light * HALO_OPACITY; f.source.level = light
    }
    sp.needsUpdate = sa.needsUpdate = true
  })
  return <><points geometry={sparks.geometry} material={sparks.material} frustumCulled={false}/>{flowers.map(f => <group key={`${f.x},${f.z}`} position={[f.x, 0, f.z]}>
    <primitive object={f.mesh} position={[0, f.y, 0]} rotation={[0, f.angle, 0]}/><primitive object={f.ring} position={[0, f.y + 0.04, 0]}/>
    <primitive object={f.halo} position={[0, f.y + HALO_HEIGHT, 0]}/>
  </group>)}</>
}
