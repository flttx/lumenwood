import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, SpriteMaterial, Sprite, type Object3D } from 'three'
import { lightSource, lightSources } from '../../rendering/LocalLights'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { groundUnder, heightAt } from '../../world/terrain/terrain'
import { OVERLOOK } from '../../world/regions'
import { waterfallTop } from '../../world/zones/Waterfall'
import { HOLLOW_HEART, SHRINE, VISTA_POINT, WATERFALL, echoStones, fordStones, giantMushrooms } from '../../world/zones/sideLayout'
import { WATER_LEVEL } from '../../world/zones/wetlandLayout'
import { radialGlowTexture } from '../flora/glowSprites'
import { createMoteMaterial } from '../route/moteMaterial'
import { secretFx } from './fx'
// What the side areas' secrets look like (2026-11-12). Giant mushrooms are VEG-007 clusters scaled up, each with its own
// material so it can wake on its own; echo stones and the shrine's stones are PRP-001 rocks with a glow; the ford stones
// glow from below the surface; the hollow's spores rise as a column of motes. The shrine is a temporary stone ring with a
// Meshy landmarks (ARC-004 shrine, PRP-009 cliff ledge, ARC-005 parapet) stand in the glen, on the island and at the edge.
const MUSHROOM_URL = `${assetConfig.baseUrl}models/vegetation/VEG-007.glb`, ROCK_URL = `${assetConfig.baseUrl}models/props/PRP-001.glb`
const SHRINE_URL = `${assetConfig.baseUrl}models/architecture/ARC-004.glb`, LIP_URL = `${assetConfig.baseUrl}models/props/PRP-009.glb`, PARAPET_URL = `${assetConfig.baseUrl}models/architecture/ARC-005.glb`
for (const url of [MUSHROOM_URL, ROCK_URL, SHRINE_URL, LIP_URL, PARAPET_URL]) useGLTF.preload(url, false, false)
const glowTexture = radialGlowTexture()
const glow = (color: number) => new SpriteMaterial({ map: glowTexture, color, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })
const SPORES = 140

function sourceMesh(scene: Object3D, url: string) {
  let found: Mesh | null = null
  scene.traverse(o => { if (!found && o instanceof Mesh) found = o })
  if (!found) throw new Error(`${url} has no mesh`)
  return found as Mesh
}

function GiantMushrooms() {
  const { scene } = useGLTF(MUSHROOM_URL, false, false)
  const items = useMemo(() => {
    const source = sourceMesh(scene, MUSHROOM_URL)
    return giantMushrooms.map(m => {
      const material = (source.material as MeshStandardMaterial).clone()
      const mesh = new Mesh(source.geometry, material)
      mesh.position.set(m.x, heightAt(m.x, m.z) - 0.1, m.z); mesh.rotation.y = m.angle; mesh.scale.setScalar(m.scale)
      mesh.castShadow = true; mesh.receiveShadow = true
      const halo = new Sprite(glow(0x9fd8ff)); halo.position.set(m.x, mesh.position.y + 0.35 * m.scale, m.z); halo.scale.setScalar(m.scale * 1.4)
      const light = lightSource([halo.position.x, halo.position.y, halo.position.z], 0x8fd0ff, 6, m.scale * 2.4)
      return { mesh, material, halo, light }
    })
  }, [scene])
  useEffect(() => {
    for (const it of items) lightSources.add(it.light)
    return () => items.forEach(it => { lightSources.delete(it.light); it.material.dispose() })
  }, [items])
  useFrame(() => {
    const dusk = atmosphere.preset.fireflies
    items.forEach((it, i) => {
      const awake = secretFx.mushrooms[i]
      it.material.emissiveIntensity = 0.15 + 0.35 * dusk + awake * (1.4 + 1.6 * dusk)
      ;(it.halo.material as SpriteMaterial).opacity = awake * (0.25 + 0.5 * dusk)
      it.light.level = awake * (0.3 + 0.7 * dusk)
    })
  })
  return <>{items.map((it, i) => <group key={i}><primitive object={it.mesh}/><primitive object={it.halo}/></group>)}</>
}

function Stones() {
  const { scene } = useGLTF(ROCK_URL, false, false)
  const items = useMemo(() => {
    const source = sourceMesh(scene, ROCK_URL)
    const stone = (x: number, z: number, scale: number, angle: number, color: number) => {
      const mesh = new Mesh(source.geometry, source.material); mesh.position.set(x, heightAt(x, z) - 0.15, z); mesh.rotation.y = angle; mesh.scale.set(scale * 0.8, scale * 1.5, scale * 0.8)
      mesh.castShadow = true; mesh.receiveShadow = true
      const halo = new Sprite(glow(color)); halo.position.set(x, mesh.position.y + 1.2 * scale, z); halo.scale.setScalar(2.6 * scale)
      return { mesh, halo }
    }
    const echo = echoStones.map((s, i) => stone(s.x, s.z, 1, i * 2.1, 0x9fe8ff))
    return { echo }
  }, [scene])
  const ford = useMemo(() => fordStones.map(f => {
    const halo = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ map: glowTexture, color: 0xfff0b8, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }))
    const size = 1.6, p = [-size, 0, -size, size, 0, -size, size, 0, size, -size, 0, size], uv = [0, 0, 1, 0, 1, 1, 0, 1]
    halo.geometry.setAttribute('position', new BufferAttribute(new Float32Array(p), 3)); halo.geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); halo.geometry.setIndex([0, 2, 1, 0, 3, 2])
    halo.position.set(f.x, WATER_LEVEL + 0.03, f.z)
    return halo
  }), [])
  const shrineLight = useMemo(() => lightSource([SHRINE[0], heightAt(SHRINE[0], SHRINE[1]) + 2.4, SHRINE[1]], 0xffc878, 8, 14), [])
  useEffect(() => { lightSources.add(shrineLight); return () => { lightSources.delete(shrineLight) } }, [shrineLight])
  useFrame(() => {
    const dusk = 0.4 + 0.6 * atmosphere.preset.fireflies
    items.echo.forEach((s, i) => { (s.halo.material as SpriteMaterial).opacity = 0.08 + secretFx.echo[i] * 0.9 * dusk })
    ford.forEach((h, i) => { (h.material as MeshBasicMaterial).opacity = 0.1 + secretFx.ford[i] * 0.9 })
    shrineLight.level = secretFx.shrine * (0.35 + 0.65 * atmosphere.preset.fireflies)
  })
  return <>
    {items.echo.map((s, i) => <group key={i}><primitive object={s.mesh}/><primitive object={s.halo}/></group>)}
    {ford.map((h, i) => <primitive key={`f${i}`} object={h}/>)}
  </>
}

/** The hollow's spore column: motes spiralling up from the heart once every mushroom is awake. */
function Spores() {
  const { geometry, material, seeds } = useMemo(() => {
    const geometry = new BufferGeometry(), seeds = Array.from({ length: SPORES }, () => [Math.random() * 6.28, Math.random(), 0.4 + Math.random() * 2.4] as const)
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(SPORES * 3), 3)); geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(SPORES), 1))
    const material = createMoteMaterial(0xb8f0ff); material.uniforms.uSize.value = 90
    return { geometry, material, seeds }
  }, [])
  const base = heightAt(HOLLOW_HEART[0], HOLLOW_HEART[1])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, k = secretFx.spores, pos = geometry.getAttribute('position') as BufferAttribute, alpha = geometry.getAttribute('aAlpha') as BufferAttribute
    material.uniforms.uTime.value = t
    seeds.forEach(([a, phase, r], j) => {
      const life = (t * 0.08 + phase) % 1, angle = a + t * 0.6 + life * 4
      pos.setXYZ(j, HOLLOW_HEART[0] + Math.cos(angle) * r * (1 - life * 0.5), base + life * 22, HOLLOW_HEART[1] + Math.sin(angle) * r * (1 - life * 0.5))
      alpha.setX(j, k * Math.sin(life * Math.PI))
    })
    pos.needsUpdate = alpha.needsUpdate = true
  })
  return <points geometry={geometry} material={material} frustumCulled={false}/>
}

/** Placed Meshy pieces (2026-11-12): ARC-004 island shrine (faces the ford, east), PRP-009 rock ledge on the glen's cliff
 *  top (its worn channel over the waterfall), ARC-005 parapet at the overlook's edge (facing back toward the player). Each
 *  GLB's front is +Z; rotation.y = θ turns it to face (sin θ, cos θ). */
function Landmarks() {
  const shrine = useGLTF(SHRINE_URL, false, false).scene, lip = useGLTF(LIP_URL, false, false).scene, parapet = useGLTF(PARAPET_URL, false, false).scene
  const parts = useMemo(() => {
    const place = (scene: Object3D, url: string, x: number, y: number, z: number, angle: number) => {
      const mesh = new Mesh(sourceMesh(scene, url).geometry, sourceMesh(scene, url).material)
      mesh.position.set(x, y, z); mesh.rotation.y = angle; mesh.castShadow = true; mesh.receiveShadow = true
      return mesh
    }
    const shrineGround = groundUnder(SHRINE[0], SHRINE[1], 1.8)
    // The ledge sits on the cliff top with its worn channel at the lip, the water leaving from its front edge.
    const lipX = WATERFALL.x - 1.6, parapetX = OVERLOOK.maxX + 0.7
    const halo = (x: number, y: number, z: number, size: number, color: number) => { const s = new Sprite(glow(color)); s.position.set(x, y, z); s.scale.setScalar(size); return s }
    return {
      meshes: [
        place(shrine, SHRINE_URL, SHRINE[0], shrineGround - 0.05, SHRINE[1], Math.PI / 2),
        place(lip, LIP_URL, lipX, waterfallTop() - 1.75, WATERFALL.z, Math.PI / 2),
        place(parapet, PARAPET_URL, parapetX, groundUnder(parapetX, VISTA_POINT[1], 1) - 0.05, VISTA_POINT[1], -Math.PI / 2),
      ],
      // The shrine's bowl (back of the arch, west of centre) and the parapet's two lanterns on its end pillars.
      shrineHalo: halo(SHRINE[0] - 0.45, shrineGround + 1.15, SHRINE[1], 1.8, 0xffd28a),
      lanterns: [-1, 1].map(side => halo(parapetX, groundUnder(parapetX, VISTA_POINT[1], 1) + 1.42, VISTA_POINT[1] + side * 1.72, 0.9, 0xffc070)),
    }
  }, [shrine, lip, parapet])
  useFrame(() => {
    const dusk = atmosphere.preset.fireflies
    ;(parts.shrineHalo.material as SpriteMaterial).opacity = 0.05 + secretFx.shrine * (0.5 + 0.5 * dusk)
    for (const l of parts.lanterns) (l.material as SpriteMaterial).opacity = 0.15 + 0.75 * dusk
  })
  return <>{parts.meshes.map((m, i) => <primitive key={i} object={m}/>)}<primitive object={parts.shrineHalo}/>{parts.lanterns.map((l, i) => <primitive key={`l${i}`} object={l}/>)}</>
}

export function SideFeatures() {
  return <><GiantMushrooms/><Stones/><Spores/><Landmarks/></>
}
