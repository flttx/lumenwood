import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Mesh, Sprite, SpriteMaterial } from 'three'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { lightSource, lightSources } from '../../rendering/LocalLights'
import { radialGlowTexture } from '../../features/flora/glowSprites'
import { cabin, LANTERN_OFFSET } from './campLayout'
// ARC-001 landmark; collision and camera occlusion use the code proxies in campLayout. At twilight the doorway lantern
// registers into LocalLights (avoiding a rogue PointLight toggle that would recompile scene shaders mid-play).
const CABIN_URL = `${assetConfig.baseUrl}models/architecture/ARC-001.glb`
const LANTERN_INTENSITY = 8
useGLTF.preload(CABIN_URL, false, false)
export function Cabin() {
  const { scene } = useGLTF(CABIN_URL, false, false)
  const halo = useRef<Sprite>(null), winA = useRef<Sprite>(null), winB = useRef<Sprite>(null)
  const materials = useMemo(() => {
    const map = radialGlowTexture()
    return {
      door: new SpriteMaterial({ map, color: 0xffc070, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false, toneMapped: false }),
      window: new SpriteMaterial({ map, color: 0xffa852, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false, toneMapped: false }),
    }
  }, [])
  const source = useMemo(() => {
    const cos = Math.cos(cabin.angle), sin = Math.sin(cabin.angle)
    const [lx, ly, lz] = LANTERN_OFFSET
    const wx = cabin.x + lx * cos + lz * sin, wz = cabin.z - lx * sin + lz * cos
    return lightSource([wx, ly, wz], 0xffb35c, LANTERN_INTENSITY, 11)
  }, [])
  useEffect(() => {
    scene.traverse(o => { if (o instanceof Mesh) o.castShadow = o.receiveShadow = true })
    lightSources.add(source)
    return () => {
      lightSources.delete(source)
      materials.door.dispose(); materials.window.dispose()
    }
  }, [scene, source, materials])
  useFrame(({ clock }) => {
    const k = atmosphere.preset.lantern
    const flicker = 0.9 + 0.07 * Math.sin(clock.elapsedTime * 7.3) + 0.03 * Math.sin(clock.elapsedTime * 15.1)
    source.level = k * flicker
    const show = k > 0.01
    if (halo.current) { halo.current.visible = show; materials.door.opacity = k * 0.58 * flicker }
    if (winA.current) winA.current.visible = show
    if (winB.current) winB.current.visible = show
    materials.window.opacity = k * 0.24 * flicker
  })
  return <group position={[cabin.x, 0, cabin.z]} rotation={[0, cabin.angle, 0]}>
    <primitive object={scene}/>
    <sprite ref={halo} position={LANTERN_OFFSET} scale={[0.72, 0.72, 1]} material={materials.door} visible={false}/>
    <sprite ref={winA} position={[-1.25, 1.55, 2.45]} scale={[1.25, 1.05, 1]} material={materials.window} visible={false}/>
    <sprite ref={winB} position={[2.58, 1.55, 0.35]} scale={[1.25, 1.05, 1]} material={materials.window} visible={false}/>
  </group>
}
