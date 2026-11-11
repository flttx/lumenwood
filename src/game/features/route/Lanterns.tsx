import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Sprite, SpriteMaterial } from 'three'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { radialGlowTexture } from '../flora/glowSprites'
import { smoothstep } from '../../shared/math'
import { route, routeClock } from './progress'
import { lanternPlacements } from './routeLayout'
// INT-002 lantern posts. Dark until lit; then the glass (the model's Emission map) warms up as the fireflies arrive, with a
// halo and a pool of light standing in for bloom and light spill (no real point lights, see task_plan decisions).
const LANTERN_URL = `${assetConfig.baseUrl}models/interactive/INT-002.glb`
const LIT_EMISSIVE = 6, FLY_IN = 0.8, WARM_UP = 1.2, SHORT_FLICKER = 0.9
const HALO_COLOR = 0xffc27a, POOL_COLOR = 0xffb867, HALO_SIZE = 1.6, POOL_SIZE = 4.5
useGLTF.preload(LANTERN_URL, false, false)

/** 0 while dark, easing to 1 once the delivered fireflies have reached the glass. */
export function lanternBrightness(litAt: number | null, now: number) { return litAt === null ? 0 : smoothstep(litAt + FLY_IN, litAt + FLY_IN + WARM_UP, now) }

export function Lanterns() {
  const { scene } = useGLTF(LANTERN_URL, false, false)
  const posts = useMemo(() => {
    const source = scene.getObjectByName('INT-002')
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error(`${LANTERN_URL} has no standard mesh named INT-002`)
    const glow = radialGlowTexture(), pool = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const additive = { transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending } as const
    return lanternPlacements.map(placement => {
      const material = source.material.clone()
      material.emissiveIntensity = 0
      const mesh = new Mesh(source.geometry, material)
      mesh.castShadow = mesh.receiveShadow = true
      const haloMaterial = new SpriteMaterial({ ...additive, color: HALO_COLOR, map: glow }), halo = new Sprite(haloMaterial)
      const poolMaterial = new MeshBasicMaterial({ ...additive, color: POOL_COLOR, map: glow }), ground = new Mesh(pool, poolMaterial)
      halo.scale.setScalar(HALO_SIZE); ground.scale.setScalar(POOL_SIZE)
      return { placement, mesh, material, halo, haloMaterial, ground, poolMaterial }
    })
  }, [scene])
  useEffect(() => () => posts.forEach(p => { p.material.dispose(); p.haloMaterial.dispose(); p.poolMaterial.dispose() }), [posts])
  useFrame(() => {
    const now = routeClock.now, night = atmosphere.preset.lantern
    posts.forEach((p, i) => {
      const lit = lanternBrightness(route.litAt[i], now)
      // Reaching a dark lantern without enough fireflies makes its glass stutter briefly: a hint, not an error.
      const since = route.shortAt[i] === null ? Infinity : now - route.shortAt[i]!
      const flicker = since < SHORT_FLICKER ? 0.5 * (1 - since / SHORT_FLICKER) * (0.5 + 0.5 * Math.sin(since * 40)) : 0
      const breathe = 1 + 0.06 * Math.sin(now * 2.1 + i * 1.7)
      p.material.emissiveIntensity = (lit * LIT_EMISSIVE * breathe + flicker) * (0.6 + 0.4 * night)
      // By day a lit lantern keeps a faint halo so the player can still tell which ones are done.
      const light = lit * (0.3 + 0.7 * night) * breathe
      p.halo.visible = p.ground.visible = light > 0.01
      p.haloMaterial.opacity = light * 0.75; p.poolMaterial.opacity = light * 0.55
    })
  })
  return <>{posts.map(p => <group key={`${p.placement.x},${p.placement.z}`}>
    <primitive object={p.mesh} position={[p.placement.x, 0, p.placement.z]} rotation={[0, p.placement.angle, 0]}/>
    <primitive object={p.halo} position={p.placement.light}/>
    <primitive object={p.ground} position={[p.placement.light[0], 0.035, p.placement.light[2]]}/>
  </group>)}</>
}
