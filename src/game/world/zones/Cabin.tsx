import { useGLTF } from '@react-three/drei'
import { assetConfig } from '../../assets/config'
import { cabin } from './campLayout'
// ARC-001 landmark; collision and camera occlusion use the code proxies in campLayout.
const CABIN_URL = `${assetConfig.baseUrl}models/architecture/ARC-001.glb`
useGLTF.preload(CABIN_URL, false, false)
export function Cabin() {
  const { scene } = useGLTF(CABIN_URL, false, false)
  return <primitive object={scene} position={[cabin.x, 0, cabin.z]} rotation={[0, cabin.angle, 0]}/>
}
