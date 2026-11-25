import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CylinderGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, SpriteMaterial, Sprite, Vector3, type Object3D, type Points } from 'three'
import { lightSource, lightSources } from '../../rendering/LocalLights'
import { reflectionSkips } from '../../rendering/planarReflection'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { groundUnder, heightAt } from '../../world/terrain/terrain'
import { OVERLOOK } from '../../world/regions'
import { waterfallTop } from '../../world/zones/Waterfall'
import { HOLLOW_HEART, REEF_HEART, SHRINE, STAR_SHRINE, VALE_HEART, VISTA_POINT, WATERFALL, echoStones, fordStones, giantMushrooms, reefCairns, valeStones } from '../../world/zones/sideLayout'
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
    return () => items.forEach(it => { lightSources.delete(it.light); it.material.dispose(); (it.halo.material as SpriteMaterial).dispose() })
  }, [items])
  useFrame(({ clock }) => {
    const dusk = atmosphere.preset.fireflies, t = clock.elapsedTime
    items.forEach((it, i) => {
      const awake = secretFx.mushrooms[i]
      // Stronger daytime emissive + gentle swell so waking a giant mushroom reads clearly even in bright afternoon light.
      it.material.emissiveIntensity = 0.08 + 0.15 * dusk + awake * (1.35 + 1.15 * dusk)
      const pulse = awake > 0.01 ? 1 + 0.03 * awake * Math.sin(t * 2.4 + i) : 1
      it.mesh.scale.setScalar(giantMushrooms[i].scale * pulse)
      ;(it.halo.material as SpriteMaterial).opacity = awake * (0.42 + 0.42 * dusk)
      it.light.level = awake * (0.35 + 0.65 * dusk)
    })
  })
  return <>{items.map((it, i) => <group key={i}><primitive object={it.mesh}/><primitive object={it.halo}/></group>)}</>
}

function Stones() {
  const { scene } = useGLTF(ROCK_URL, false, false)
  const items = useMemo(() => {
    const source = sourceMesh(scene, ROCK_URL)
    const stone = (x: number, z: number, [sx, sy, sz]: [number, number, number], angle: number, color: number, haloScale: number, haloY: number) => {
      const mesh = new Mesh(source.geometry, source.material); mesh.position.set(x, heightAt(x, z) - 0.15, z); mesh.rotation.y = angle; mesh.scale.set(sx, sy, sz)
      mesh.castShadow = true; mesh.receiveShadow = true
      const halo = new Sprite(glow(color)); halo.position.set(x, mesh.position.y + haloY, z); halo.scale.setScalar(haloScale)
      return { mesh, halo }
    }
    const echo = echoStones.map((s, i) => stone(s.x, s.z, [0.8, 1.5, 0.8], i * 2.1, 0x9fe8ff, 2.6, 1.2))
    const vale = valeStones.map(s => stone(s.x, s.z, [1.05, 2.25, 1.05], s.angle, 0xffe09c, 3.0, 2.2))
    const reef = reefCairns.map(c => stone(c.x, c.z, [0.95, 1.45, 0.95], c.angle, 0x9ef6ff, 2.6, 1.45))
    const beamGeometry = new CylinderGeometry(0.035, 0.06, 1, 8, 1, true)
    const up = new Vector3(0, 1, 0), valeTarget = new Vector3(VALE_HEART[0], groundUnder(VALE_HEART[0], VALE_HEART[1], 1.8) + 1.25, VALE_HEART[1])
    const valeBeams = valeStones.map(s => {
      const start = new Vector3(s.x, heightAt(s.x, s.z) + 2.25, s.z)
      const dir = valeTarget.clone().sub(start), len = dir.length()
      const mat = new MeshBasicMaterial({ color: 0xffe49c, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, fog: false })
      const mesh = new Mesh(beamGeometry, mat)
      mesh.position.copy(start).lerp(valeTarget, 0.5)
      mesh.quaternion.setFromUnitVectors(up, dir.normalize())
      mesh.scale.set(1, len, 1)
      mesh.visible = false
      return { mesh, mat }
    })
    return { echo, vale, reef, beamGeometry, valeBeams }
  }, [scene])
  const ford = useMemo(() => fordStones.map(f => {
    const halo = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ map: glowTexture, color: 0xfff0b8, blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }))
    const size = 1.6, p = [-size, 0, -size, size, 0, -size, size, 0, size, -size, 0, size], uv = [0, 0, 1, 0, 1, 1, 0, 1]
    halo.geometry.setAttribute('position', new BufferAttribute(new Float32Array(p), 3)); halo.geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); halo.geometry.setIndex([0, 2, 1, 0, 3, 2])
    halo.position.set(f.x, WATER_LEVEL + 0.03, f.z)
    return halo
  }), [])
  const lights = useMemo(() => ({
    shrine: lightSource([SHRINE[0], heightAt(SHRINE[0], SHRINE[1]) + 2.4, SHRINE[1]], 0xffc878, 8, 14),
    vale: lightSource([VALE_HEART[0], heightAt(VALE_HEART[0], VALE_HEART[1]) + 2.4, VALE_HEART[1]], 0xffd27a, 8, 15),
    reef: lightSource([REEF_HEART[0], heightAt(REEF_HEART[0], REEF_HEART[1]) + 2.0, REEF_HEART[1]], 0x9ef6ff, 6, 13),
    star: lightSource([STAR_SHRINE[0], heightAt(STAR_SHRINE[0], STAR_SHRINE[1]) + 2.4, STAR_SHRINE[1]], 0xb8e6ff, 7, 14),
  }), [])
  useEffect(() => {
    const list = Object.values(lights)
    for (const l of list) lightSources.add(l)
    for (const b of items.valeBeams) reflectionSkips.add(b.mesh)
    return () => {
      for (const l of list) lightSources.delete(l)
      for (const b of items.valeBeams) reflectionSkips.delete(b.mesh)
    }
  }, [lights, items])
  useEffect(() => () => {
    items.echo.forEach(s => (s.halo.material as SpriteMaterial).dispose())
    items.vale.forEach(s => (s.halo.material as SpriteMaterial).dispose())
    items.reef.forEach(s => (s.halo.material as SpriteMaterial).dispose())
    items.valeBeams.forEach(b => b.mat.dispose())
    items.beamGeometry.dispose()
    ford.forEach(h => { h.geometry.dispose(); (h.material as MeshBasicMaterial).dispose() })
  }, [items, ford])
  useFrame(({ clock }) => {
    const dusk = 0.55 + 0.45 * atmosphere.preset.fireflies, t = clock.elapsedTime
    items.echo.forEach((s, i) => { (s.halo.material as SpriteMaterial).opacity = 0.12 + secretFx.echo[i] * 0.9 * dusk })
    items.vale.forEach((s, i) => {
      const k = secretFx.vale[i]
      ;(s.halo.material as SpriteMaterial).opacity = 0.08 + k * (0.45 + 0.42 * dusk)
      const b = items.valeBeams[i]
      b.mesh.visible = k > 0.02
      if (b.mesh.visible) b.mat.opacity = k * (0.35 + 0.25 * dusk)
    })
    items.reef.forEach((c, i) => {
      ;(c.halo.material as SpriteMaterial).opacity = 0.08 + secretFx.reef[i] * (0.45 + 0.4 * dusk)
    })
    // Pulse the next expected ford stone gently so the player can spot the start and progression across the lake.
    ford.forEach((h, i) => {
      const nextHint = secretFx.shrine < 0.5 && secretFx.ford[i] < 0.05 && i === secretFx.nextFord ? 0.22 + 0.14 * Math.sin(t * 3.2) : 0
      ;(h.material as MeshBasicMaterial).opacity = Math.max(0.1 + secretFx.ford[i] * 0.9, nextHint)
    })
    const nightBoost = 0.35 + 0.65 * atmosphere.preset.fireflies
    lights.shrine.level = secretFx.shrine * nightBoost
    lights.vale.level = secretFx.valeShrine * nightBoost
    lights.reef.level = secretFx.reefBeacon * nightBoost
    lights.star.level = 0.25 * dusk + secretFx.starFlare * 0.85
  })
  return <>
    {items.echo.map((s, i) => <group key={`e${i}`}><primitive object={s.mesh}/><primitive object={s.halo}/></group>)}
    {items.vale.map((s, i) => <group key={`v${i}`}><primitive object={s.mesh}/><primitive object={s.halo}/></group>)}
    {items.valeBeams.map((b, i) => <primitive key={`vb${i}`} object={b.mesh}/>)}
    {items.reef.map((c, i) => <group key={`r${i}`}><primitive object={c.mesh}/><primitive object={c.halo}/></group>)}
    {ford.map((h, i) => <primitive key={`f${i}`} object={h}/>)}
  </>
}

/** The hollow's spore column: motes spiralling up from the heart once every mushroom is awake. */
function Spores() {
  const dpr = useThree(s => s.viewport.dpr)
  const pointsRef = useRef<Points>(null)
  const { geometry, material, seeds } = useMemo(() => {
    const geometry = new BufferGeometry(), seeds = Array.from({ length: SPORES }, () => [Math.random() * 6.28, Math.random(), 0.4 + Math.random() * 2.4] as const)
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(SPORES * 3), 3)); geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(SPORES), 1))
    const material = createMoteMaterial(0xb8f0ff); material.uniforms.uSize.value = 90
    return { geometry, material, seeds }
  }, [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  const base = heightAt(HOLLOW_HEART[0], HOLLOW_HEART[1])
  useFrame(({ clock }) => {
    const k = secretFx.spores
    if (pointsRef.current) pointsRef.current.visible = k > 0.001
    if (k <= 0.001) return
    const t = clock.elapsedTime, pos = geometry.getAttribute('position') as BufferAttribute, alpha = geometry.getAttribute('aAlpha') as BufferAttribute
    material.uniforms.uTime.value = t; material.uniforms.uSize.value = 90 * dpr
    seeds.forEach(([a, phase, r], j) => {
      const life = (t * 0.08 + phase) % 1, angle = a + t * 0.6 + life * 4
      pos.setXYZ(j, HOLLOW_HEART[0] + Math.cos(angle) * r * (1 - life * 0.5), base + life * 22, HOLLOW_HEART[1] + Math.sin(angle) * r * (1 - life * 0.5))
      alpha.setX(j, k * Math.sin(life * Math.PI))
    })
    pos.needsUpdate = alpha.needsUpdate = true
  })
  return <points ref={pointsRef} geometry={geometry} material={material} visible={false} frustumCulled={false}/>
}

/** Placed Meshy pieces (2026-11-12): ARC-004 island shrine (faces the ford, east), PRP-009 rock ledge on the glen's cliff
 *  top (its worn channel over the waterfall), ARC-005 parapet at the overlook's edge (facing back toward the player). Each
 *  GLB's front is +Z; rotation.y = θ turns it to face (sin θ, cos θ). */
function Landmarks() {
  const shrine = useGLTF(SHRINE_URL, false, false).scene, lip = useGLTF(LIP_URL, false, false).scene, parapet = useGLTF(PARAPET_URL, false, false).scene
  const rock = useGLTF(ROCK_URL, false, false).scene
  const parts = useMemo(() => {
    const place = (scene: Object3D, url: string, x: number, y: number, z: number, angle: number, scale: [number, number, number] = [1, 1, 1]) => {
      const mesh = new Mesh(sourceMesh(scene, url).geometry, sourceMesh(scene, url).material)
      mesh.position.set(x, y, z); mesh.rotation.y = angle; mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true
      return mesh
    }
    const shrineGround = groundUnder(SHRINE[0], SHRINE[1], 1.8)
    const valeGround = groundUnder(VALE_HEART[0], VALE_HEART[1], 1.8)
    const starGround = groundUnder(STAR_SHRINE[0], STAR_SHRINE[1], 1.8)
    // The ledge sits on the cliff top with its worn channel at the lip, the water leaving from its front edge.
    const lipX = WATERFALL.x - 1.6, topY = waterfallTop(), parapetX = OVERLOOK.maxX + 0.7
    const reefParapetZ = -124.5, starParapetZ = 374.5
    // Grounded rock outcrops framing the waterfall lip shoulders (buried into the cliff crest) and plunge pool base.
    const cliffRocks: [number, number, number, number, [number, number, number]][] = [
      [WATERFALL.x - 2.3, topY - 2.7, WATERFALL.z - 4.5, 0.7, [2.8, 2.5, 2.9]],
      [WATERFALL.x - 2.1, topY - 2.5, WATERFALL.z + 4.5, 2.3, [2.9, 2.6, 2.6]],
      [WATERFALL.x - 2.8, topY - 2.9, WATERFALL.z - 9.4, 1.4, [3.2, 2.7, 3.0]],
      [WATERFALL.x - 2.6, topY - 2.8, WATERFALL.z + 9.6, 4.1, [3.1, 2.8, 3.2]],
      [WATERFALL.x + 0.9, WATER_LEVEL - 0.85, WATERFALL.z - 5.2, 1.1, [3.1, 3.8, 2.8]],
      [WATERFALL.x + 1.0, WATER_LEVEL - 0.85, WATERFALL.z + 5.4, 2.8, [3.2, 4.1, 2.9]],
      [WATERFALL.x + 0.7, WATER_LEVEL - 0.8, WATERFALL.z - 10.6, 3.8, [3.6, 4.4, 3.2]],
      [WATERFALL.x + 0.8, WATER_LEVEL - 0.8, WATERFALL.z + 11.0, 0.9, [3.5, 4.2, 3.4]],
      [WATERFALL.x + 2.4, WATER_LEVEL - 0.65, WATERFALL.z - 7.8, 2.2, [2.2, 1.8, 2.2]],
      [WATERFALL.x + 2.5, WATER_LEVEL - 0.65, WATERFALL.z + 8.0, 4.6, [2.4, 1.9, 2.3]],
    ]
    const halo = (x: number, y: number, z: number, size: number, color: number) => { const s = new Sprite(glow(color)); s.position.set(x, y, z); s.scale.setScalar(size); return s }
    return {
      meshes: [
        place(shrine, SHRINE_URL, SHRINE[0], shrineGround - 0.05, SHRINE[1], Math.PI / 2),
        place(lip, LIP_URL, lipX, topY - 1.75, WATERFALL.z, Math.PI / 2),
        ...cliffRocks.map(([x, y, z, a, s]) => place(rock, ROCK_URL, x, y, z, a, s)),
        place(parapet, PARAPET_URL, parapetX, groundUnder(parapetX, VISTA_POINT[1], 1) - 0.05, VISTA_POINT[1], -Math.PI / 2),
        place(shrine, SHRINE_URL, VALE_HEART[0], valeGround - 0.05, VALE_HEART[1], Math.PI),
        place(shrine, SHRINE_URL, STAR_SHRINE[0], starGround - 0.05, STAR_SHRINE[1], Math.PI),
        place(parapet, PARAPET_URL, 0, groundUnder(0, reefParapetZ, 1) - 0.05, reefParapetZ, 0),
        place(parapet, PARAPET_URL, STAR_SHRINE[0], groundUnder(STAR_SHRINE[0], starParapetZ, 1) - 0.05, starParapetZ, Math.PI),
      ],
      // Each shrine's bowl (behind the arch's local +Z front) and the parapets' corner pillar lanterns.
      shrineHalo: halo(SHRINE[0] - 0.45, shrineGround + 1.15, SHRINE[1], 1.8, 0xffd28a),
      valeHalo: halo(VALE_HEART[0], valeGround + 1.15, VALE_HEART[1] + 0.45, 2.0, 0xffd68a),
      starHalo: halo(STAR_SHRINE[0], starGround + 1.15, STAR_SHRINE[1] + 0.45, 2.1, 0xb8e6ff),
      lanterns: [
        ...[-1, 1].map(side => halo(parapetX, groundUnder(parapetX, VISTA_POINT[1], 1) + 1.42, VISTA_POINT[1] + side * 1.72, 0.9, 0xffc070)),
        ...[-1, 1].map(side => halo(side * 1.72, groundUnder(0, reefParapetZ, 1) + 1.42, reefParapetZ, 0.9, 0x9ef0ff)),
        ...[-1, 1].map(side => halo(STAR_SHRINE[0] + side * 1.72, groundUnder(STAR_SHRINE[0], starParapetZ, 1) + 1.42, starParapetZ, 0.9, 0xffe0a0)),
      ],
    }
  }, [shrine, lip, parapet, rock])
  useEffect(() => () => {
    ;(parts.shrineHalo.material as SpriteMaterial).dispose()
    ;(parts.valeHalo.material as SpriteMaterial).dispose()
    ;(parts.starHalo.material as SpriteMaterial).dispose()
    parts.lanterns.forEach(l => (l.material as SpriteMaterial).dispose())
  }, [parts])
  useFrame(() => {
    const dusk = atmosphere.preset.fireflies
    ;(parts.shrineHalo.material as SpriteMaterial).opacity = 0.05 + secretFx.shrine * (0.5 + 0.5 * dusk)
    ;(parts.valeHalo.material as SpriteMaterial).opacity = 0.08 + secretFx.valeShrine * (0.5 + 0.5 * dusk)
    ;(parts.starHalo.material as SpriteMaterial).opacity = 0.25 + 0.35 * dusk + secretFx.starFlare * 0.4
    for (const l of parts.lanterns) (l.material as SpriteMaterial).opacity = 0.15 + 0.75 * dusk
  })
  return <>{parts.meshes.map((m, i) => <primitive key={i} object={m}/>)}<primitive object={parts.shrineHalo}/><primitive object={parts.valeHalo}/><primitive object={parts.starHalo}/>{parts.lanterns.map((l, i) => <primitive key={`l${i}`} object={l}/>)}</>
}

export function SideFeatures() {
  return <><GiantMushrooms/><Stones/><Spores/><Landmarks/></>
}
