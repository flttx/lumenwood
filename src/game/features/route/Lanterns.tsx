import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Mesh, MeshStandardMaterial, Sprite, SpriteMaterial } from 'three'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { radialGlowTexture } from '../flora/glowSprites'
import { smoothstep } from '../../shared/math'
import { lightSource, lightSources } from '../../rendering/LocalLights'
import { route, routeClock } from './progress'
import { lanternPlacements, type NodeKind } from './routeLayout'
// Route light nodes: INT-002 lantern posts and INT-003 moss-stone cradles. Dark until lit; then the glass or hollow (the
// model's Emission map) warms up as the fireflies arrive. After dusk each lit node is a real light source (LocalLights) that
// warms the ground, grass and trunks around it; a faint halo adds the glow in the air (bloom does the rest).
const FLY_IN = 0.8, WARM_UP = 1.2, SHORT_FLICKER = 0.9
interface NodeStyle { id: string; url: string; litEmissive: number; halo: number; light: number; haloSize: number; candela: number; range: number }
const styles: Record<NodeKind, NodeStyle> = {
  post: { id: 'INT-002', url: `${assetConfig.baseUrl}models/interactive/INT-002.glb`, litEmissive: 6, halo: 0xffc27a, light: 0xffb25e, haloSize: 1.1, candela: 7, range: 11 },
  cradle: { id: 'INT-003', url: `${assetConfig.baseUrl}models/interactive/INT-003.glb`, litEmissive: 5, halo: 0xffd9a0, light: 0xffc27a, haloSize: 1.0, candela: 8, range: 12 },
}
for (const style of Object.values(styles)) useGLTF.preload(style.url, false, false)
/** Where a node's point light sits: a point light right at the glass would blow out the post or stone holding it, so the
 *  light hangs a little outside (posts: out along the arm and lower; cradles: above the hollow). */
export function lightPoint(p: { kind: NodeKind; x: number; z: number; light: [number, number, number] }): [number, number, number] {
  const [lx, ly, lz] = p.light
  if (p.kind === 'cradle') return [lx, ly + 0.55, lz]
  const dx = lx - p.x, dz = lz - p.z, d = Math.hypot(dx, dz) || 1
  return [lx + (dx / d) * 0.55, ly - 0.15, lz + (dz / d) * 0.55]
}

/** 0 while dark, easing to 1 once the delivered fireflies have arrived. */
export function lanternBrightness(litAt: number | null, now: number) { return litAt === null ? 0 : smoothstep(litAt + FLY_IN, litAt + FLY_IN + WARM_UP, now) }

export function Lanterns({ kind }: { kind: NodeKind }) {
  const style = styles[kind]
  const { scene } = useGLTF(style.url, false, false)
  const nodes = useMemo(() => {
    const source = scene.getObjectByName(style.id)
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error(`${style.url} has no standard mesh named ${style.id}`)
    const glow = radialGlowTexture()
    const additive = { transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false } as const
    return lanternPlacements.flatMap((placement, index) => placement.kind !== kind ? [] : [{ placement, index }]).map(({ placement, index }) => {
      const material = source.material.clone()
      material.emissiveIntensity = 0
      const mesh = new Mesh(source.geometry, material)
      mesh.castShadow = mesh.receiveShadow = true
      const haloMaterial = new SpriteMaterial({ ...additive, color: style.halo, map: glow }), halo = new Sprite(haloMaterial)
      halo.scale.setScalar(style.haloSize)
      return { placement, index, mesh, material, halo, haloMaterial, source: lightSource(lightPoint(placement), style.light, style.candela, style.range) }
    })
  }, [scene, style, kind])
  useEffect(() => {
    nodes.forEach(p => lightSources.add(p.source))
    return () => nodes.forEach(p => { lightSources.delete(p.source); p.material.dispose(); p.haloMaterial.dispose() })
  }, [nodes])
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
      p.halo.visible = light > 0.01
      p.haloMaterial.opacity = light * 0.4
      p.source.level = lit * night * breathe
    })
  })
  return <>{nodes.map(p => <group key={`${p.placement.x},${p.placement.z}`}>
    <primitive object={p.mesh} position={[p.placement.x, p.placement.ground, p.placement.z]} rotation={[0, p.placement.angle, 0]}/>
    <primitive object={p.halo} position={p.placement.light}/>
  </group>)}</>
}
