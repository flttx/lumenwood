import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CircleGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Sprite, SpriteMaterial, TorusGeometry, Vector3 } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { radialGlowTexture } from '../flora/glowSprites'
import { route } from '../route/progress'
import { SUN_HEIGHT, SUN_MIRRORS } from './layout'
import { hasDaylight, mirrorDirection, traceSunlight } from './progress'

/** TEMPORARY optical fixtures. Stone pedestals are existing Meshy assets; these discs await a formal asset pass. */
export function SunlightOptics() {
  const items = useMemo(() => {
    const face = new MeshStandardMaterial({ color: 0xd9e7ca, metalness: 0.72, roughness: 0.22, emissive: 0xffd894, emissiveIntensity: 0.2, side: DoubleSide })
    const brass = new MeshStandardMaterial({ color: 0xa47a39, metalness: 0.6, roughness: 0.45 })
    const core = new MeshBasicMaterial({ color: 0xffedba, toneMapped: false })
    const haze = new MeshBasicMaterial({ color: 0xffd879, transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })
    const discGeo = new CircleGeometry(0.49, 32), rimGeo = new TorusGeometry(0.51, 0.045, 6, 32), stemGeo = new CylinderGeometry(0.055, 0.085, 0.7, 8), beamGeo = new CylinderGeometry(1, 1, 1, 8)
    const mirrors = SUN_MIRRORS.map(m => {
      const disc = new Group(); disc.position.set(m.x, SUN_HEIGHT, m.z)
      disc.add(new Mesh(discGeo, face), new Mesh(rimGeo, brass))
      const stem = new Mesh(stemGeo, brass); stem.position.set(m.x, 0.92, m.z); stem.castShadow = true
      return { disc, stem }
    })
    const beams = Array.from({ length: 4 }, () => ({ core: new Mesh(beamGeo, core), haze: new Mesh(beamGeo, haze), spot: new Sprite(new SpriteMaterial({ map: radialGlowTexture(), color: 0xffe5a4, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })) }))
    return { mirrors, beams, materials: [face, brass, core, haze], geometries: [discGeo, rimGeo, stemGeo, beamGeo], from: new Vector3(), to: new Vector3(), dir: new Vector3(), normal: new Vector3(), up: new Vector3(0, 1, 0), front: new Vector3(0, 0, 1) }
  }, [])
  useEffect(() => () => { items.materials.forEach(m => m.dispose()); items.geometries.forEach(g => g.dispose()); items.beams.forEach(b => b.spot.material.dispose()) }, [items])
  useFrame(() => {
    const day = hasDaylight(atmosphere.time), path = traceSunlight(route.sunlight.steps, day)
    const sun = atmosphere.preset, elevation = sun.sunElevation, azimuth = sun.sunAzimuth
    const sunX = Math.sin(azimuth) * Math.cos(elevation), sunY = Math.sin(elevation), sunZ = Math.cos(azimuth) * Math.cos(elevation)
    const a = SUN_MIRRORS[0]
    const incoming = { from: { x: a.x + sunX * 22, z: a.z + sunZ * 22 }, to: a }
    const segments = day ? [incoming, ...path.segments] : []
    items.beams.forEach((b, i) => {
      const s = segments[i]
      b.core.visible = b.haze.visible = b.spot.visible = !!s
      if (!s) return
      items.from.set(s.from.x, i === 0 ? SUN_HEIGHT + sunY * 22 : SUN_HEIGHT, s.from.z)
      items.to.set(s.to.x, SUN_HEIGHT, s.to.z)
      items.dir.subVectors(items.to, items.from)
      const length = items.dir.length()
      for (const mesh of [b.core, b.haze]) { mesh.position.copy(items.from).add(items.to).multiplyScalar(0.5); mesh.quaternion.setFromUnitVectors(items.up, items.dir.normalize()); mesh.scale.set(mesh === b.core ? 0.025 : 0.13, length, mesh === b.core ? 0.025 : 0.13) }
      b.spot.position.copy(items.to); b.spot.scale.setScalar(i === 0 ? 0.5 : 0.65)
      b.spot.material.opacity = 0.42
    })
    items.mirrors.forEach((m, i) => {
      const out = mirrorDirection(route.sunlight.steps[i])
      // Reflect the incoming ray onto the chosen outgoing heading. The disc's normal bisects those directions.
      items.normal.set(i === 0 ? -sunX : 1, i === 0 ? -sunY : 0, i === 0 ? -sunZ : 0).sub(items.dir.set(out.x, 0, out.z)).normalize()
      if (items.normal.lengthSq() < 0.001) items.normal.set(0, 0, 1)
      m.disc.quaternion.setFromUnitVectors(items.front, items.normal)
    })
  })
  return <group name="Sunlight-Temporary-Optics">
    {items.mirrors.map((m, i) => <group key={i}><primitive object={m.stem}/><primitive object={m.disc}/></group>)}
    {items.beams.map((b, i) => <group key={i}><primitive object={b.core}/><primitive object={b.haze}/><primitive object={b.spot}/></group>)}
  </group>
}
