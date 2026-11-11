import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Mesh, type MeshBasicMaterial, type PointLight } from 'three'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { cabin, LANTERN_OFFSET } from './campLayout'
// ARC-001 landmark; collision and camera occlusion use the code proxies in campLayout. At twilight a code point light and
// a small additive halo sit at the modelled lantern beside the door.
const CABIN_URL = `${assetConfig.baseUrl}models/architecture/ARC-001.glb`
const LANTERN_INTENSITY = 7
useGLTF.preload(CABIN_URL, false, false)
export function Cabin() {
  const { scene } = useGLTF(CABIN_URL, false, false)
  const light = useRef<PointLight>(null), halo = useRef<MeshBasicMaterial>(null)
  useEffect(() => scene.traverse(o => { if (o instanceof Mesh) o.castShadow = o.receiveShadow = true }), [scene])
  useFrame(() => {
    const k = atmosphere.preset.lantern
    if (light.current) { light.current.intensity = k * LANTERN_INTENSITY; light.current.visible = k > 0.01 }
    if (halo.current) halo.current.opacity = k * 0.8
  })
  return <group position={[cabin.x, 0, cabin.z]} rotation={[0, cabin.angle, 0]}>
    <primitive object={scene}/>
    <group position={LANTERN_OFFSET}>
      <pointLight ref={light} color={0xffb35c} distance={10} decay={2}/>
      <mesh><sphereGeometry args={[0.16, 12, 8]}/><meshBasicMaterial ref={halo} color={0xffc070} transparent depthWrite={false} toneMapped={false}/></mesh>
    </group>
  </group>
}
