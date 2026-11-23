import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Group, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three'
import { route } from '../route/progress'
import { SUN_BRIDGE, sunlightDeckHeight } from './layout'
import { VineLeaves } from './VineLeaves'

/** TEMPORARY woven vines for playtesting. Their upper surface matches the bridge's collision arch. */
export function VineBridge() {
  const group = useRef<Group>(null!)
  const items = useMemo(() => {
    const material = new MeshStandardMaterial({ color: 0x586c35, roughness: 0.95 })
    const ribs = new MeshStandardMaterial({ color: 0x6a5739, roughness: 1 })
    const length = SUN_BRIDGE.to - SUN_BRIDGE.from
    const arch = (t: number) => sunlightDeckHeight(SUN_BRIDGE.x, SUN_BRIDGE.from + t * length, true)
    const ropes = Array.from({ length: 9 }, (_, i) => {
      const x = -SUN_BRIDGE.halfWidth + 0.13 + i * (2 * SUN_BRIDGE.halfWidth - 0.26) / 8
      return new TubeGeometry(new CatmullRomCurve3(Array.from({ length: 33 }, (_, j) => { const t = j / 32, weave = Math.sin(Math.PI * t); return new Vector3(x + Math.sin(t * 22 + i * 1.8) * 0.07 * weave, arch(t) - 0.12 + Math.sin(t * 18 + i) * 0.025 * weave, t * length) })), 40, 0.11 + i % 3 * 0.008, 6, false)
    })
    const cross = Array.from({ length: 14 }, (_, i) => {
      const t = (i + 0.5) / 14
      return new TubeGeometry(new CatmullRomCurve3([new Vector3(-1.3, arch(t) - 0.04, t * length), new Vector3(-0.4, arch(t) + 0.01, t * length - 0.16), new Vector3(0.5, arch(t) - 0.02, t * length + 0.1), new Vector3(1.3, arch(t) - 0.04, t * length + Math.sin(i) * 0.2)]), 12, 0.04, 5, false)
    })
    return { material, ribs, ropes, cross }
  }, [])
  useEffect(() => () => { items.material.dispose(); items.ribs.dispose(); [...items.ropes, ...items.cross].forEach(g => g.dispose()) }, [items])
  useFrame(() => { const g = route.sunlight.growth; group.current.visible = g > 0.005; group.current.scale.set(0.75 + g * 0.25, 0.3 + g * 0.7, Math.max(0.001, g)) })
  return <group ref={group} name="Sunlight-Temporary-Vine-Bridge" position={[SUN_BRIDGE.x, 0, SUN_BRIDGE.from]} visible={false}>
    {items.ropes.map((g, i) => <mesh key={i} geometry={g} material={items.material} castShadow receiveShadow/>)}
    {items.cross.map((g, i) => <mesh key={i} geometry={g} material={items.ribs} castShadow receiveShadow/>)}
    <VineLeaves/>
  </group>
}
