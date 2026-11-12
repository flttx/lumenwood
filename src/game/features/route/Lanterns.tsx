import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Sprite, SpriteMaterial } from 'three'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { radialGlowTexture } from '../flora/glowSprites'
import { smoothstep } from '../../shared/math'
import { route, routeClock } from './progress'
import { lanternPlacements, type NodeKind } from './routeLayout'
// Route light nodes: INT-002 lantern posts and INT-003 moss-stone cradles. Dark until lit; then the glass or hollow (the
// model's Emission map) warms up as the fireflies arrive, with a halo and a pool of light standing in for bloom and light
// spill (no real point lights, see task_plan decisions).
const FLY_IN = 0.8, WARM_UP = 1.2, SHORT_FLICKER = 0.9
interface NodeStyle { id: string; url: string; litEmissive: number; halo: number; pool: number; haloSize: number; poolSize: number }
const styles: Record<NodeKind, NodeStyle> = {
  post: { id: 'INT-002', url: `${assetConfig.baseUrl}models/interactive/INT-002.glb`, litEmissive: 6, halo: 0xffc27a, pool: 0xffb867, haloSize: 1.6, poolSize: 4.5 },
  cradle: { id: 'INT-003', url: `${assetConfig.baseUrl}models/interactive/INT-003.glb`, litEmissive: 5, halo: 0xffd9a0, pool: 0xffc985, haloSize: 1.4, poolSize: 3.8 },
}
for (const style of Object.values(styles)) useGLTF.preload(style.url, false, false)

/** 0 while dark, easing to 1 once the delivered fireflies have arrived. */
export function lanternBrightness(litAt: number | null, now: number) { return litAt === null ? 0 : smoothstep(litAt + FLY_IN, litAt + FLY_IN + WARM_UP, now) }

export function Lanterns({ kind }: { kind: NodeKind }) {
  const style = styles[kind]
  const { scene } = useGLTF(style.url, false, false)
  const nodes = useMemo(() => {
    const source = scene.getObjectByName(style.id)
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error(`${style.url} has no standard mesh named ${style.id}`)
    const glow = radialGlowTexture(), pool = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    const additive = { transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false } as const
    return lanternPlacements.flatMap((placement, index) => placement.kind !== kind ? [] : [{ placement, index }]).map(({ placement, index }) => {
      const material = source.material.clone()
      material.emissiveIntensity = 0
      const mesh = new Mesh(source.geometry, material)
      mesh.castShadow = mesh.receiveShadow = true
      const haloMaterial = new SpriteMaterial({ ...additive, color: style.halo, map: glow }), halo = new Sprite(haloMaterial)
      const poolMaterial = new MeshBasicMaterial({ ...additive, color: style.pool, map: glow }), ground = new Mesh(pool, poolMaterial)
      halo.scale.setScalar(style.haloSize); ground.scale.setScalar(style.poolSize)
      return { placement, index, mesh, material, halo, haloMaterial, ground, poolMaterial }
    })
  }, [scene, style, kind])
  useEffect(() => () => nodes.forEach(p => { p.material.dispose(); p.haloMaterial.dispose(); p.poolMaterial.dispose() }), [nodes])
  useFrame(() => {
    const now = routeClock.now, night = atmosphere.preset.lantern
    nodes.forEach(p => {
      const i = p.index, lit = lanternBrightness(route.litAt[i], now)
      // Reaching a dark node without enough fireflies makes it stutter briefly: a hint, not an error.
      const since = route.shortAt[i] === null ? Infinity : now - route.shortAt[i]!
      const flicker = since < SHORT_FLICKER ? 0.5 * (1 - since / SHORT_FLICKER) * (0.5 + 0.5 * Math.sin(since * 40)) : 0
      const breathe = 1 + 0.06 * Math.sin(now * 2.1 + i * 1.7)
      p.material.emissiveIntensity = (lit * style.litEmissive * breathe + flicker) * (0.6 + 0.4 * night)
      // By day a lit node keeps a faint halo so the player can still tell which ones are done.
      const light = lit * (0.3 + 0.7 * night) * breathe
      p.halo.visible = p.ground.visible = light > 0.01
      p.haloMaterial.opacity = light * 0.75; p.poolMaterial.opacity = light * 0.55
    })
  })
  return <>{nodes.map(p => <group key={`${p.placement.x},${p.placement.z}`}>
    <primitive object={p.mesh} position={[p.placement.x, p.placement.ground, p.placement.z]} rotation={[0, p.placement.angle, 0]}/>
    <primitive object={p.halo} position={p.placement.light}/>
    <primitive object={p.ground} position={[p.placement.light[0], p.placement.ground + 0.035, p.placement.light[2]]}/>
  </group>)}</>
}
