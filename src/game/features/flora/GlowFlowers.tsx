import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Mesh, MeshStandardMaterial, type Vector3 } from 'three'
import { assetConfig } from '../../assets/config'
import { glowFlowers } from '../../world/zones/campLayout'
import { dampFactor } from '../../player/movement'
import { GLOW_BASE, glowTarget } from './glow'
import { atmosphere } from '../../rendering/timeOfDay'
// INT-001 interactive flowers. Each copy owns its material so its glow can react on its own; the geometry is shared.
const FLOWER_URL = `${assetConfig.baseUrl}models/interactive/INT-001.glb`
const GLOW_RATE = 3
useGLTF.preload(FLOWER_URL, false, false)

export function GlowFlowers({ player }: { player: Vector3 }) {
  const { scene } = useGLTF(FLOWER_URL, false, false)
  const flowers = useMemo(() => {
    const source = scene.getObjectByName('INT-001')
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error(`${FLOWER_URL} has no standard mesh named INT-001`)
    const geometry = source.geometry, base = source.material
    return glowFlowers.map(spot => {
      const material = base.clone()
      material.emissiveIntensity = GLOW_BASE
      return { ...spot, mesh: new Mesh(geometry, material), material }
    })
  }, [scene])
  useFrame((_, delta) => {
    const k = dampFactor(GLOW_RATE, Math.min(delta, 0.1))
    // Twilight multiplies the glow so the flowers read as light sources once the sun is down.
    const scale = atmosphere.preset.flowerGlow
    for (const f of flowers) f.material.emissiveIntensity += (glowTarget(Math.hypot(player.x - f.x, player.z - f.z)) * scale - f.material.emissiveIntensity) * k
  })
  return <>{flowers.map(f => <primitive key={`${f.x},${f.z}`} object={f.mesh} position={[f.x, 0, f.z]} rotation={[0, f.angle, 0]}/>)}</>
}
