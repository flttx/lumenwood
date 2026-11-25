import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Mesh, MeshStandardMaterial } from 'three'
import type { Object3D, Vector3 } from 'three'
import { assetConfig } from '../../assets/config'
import { route } from '../route/progress'
import { SUN_BLOCKER, SUN_MIRRORS, SUN_PLANT } from './layout'
import { SunlightDirector } from './SunlightDirector'
import { SunlightOptics } from './SunlightOptics'
import { VineBridge } from './VineBridge'
import { SunlightBanks } from './SunlightBanks'

const base = `${assetConfig.baseUrl}models/`
const urls = { cradle: `${base}interactive/INT-003.glb`, plant: `${base}interactive/INT-004.glb`, rock: `${base}props/PRP-001.glb`, fern: `${base}vegetation/VEG-006.glb` }
Object.values(urls).forEach(url => useGLTF.preload(url, false, false))
/** Only existing, registered Meshy assets are reused here. Optical faces and woven bridge remain labelled greyboxes. */
function ReusedProps() {
  const cradle = useGLTF(urls.cradle, false, false), plant = useGLTF(urls.plant, false, false), rock = useGLTF(urls.rock, false, false), fern = useGLTF(urls.fern, false, false)
  const items = useMemo(() => {
    const materials: MeshStandardMaterial[] = []
    const copy = (scene: Object3D, x: number, z: number, scale: number) => {
      const obj = scene.clone(true); obj.position.set(x, 0, z); obj.scale.setScalar(scale)
      obj.traverse(o => { if (o.name.endsWith('_LOD1')) o.visible = false; if (o instanceof Mesh) { o.castShadow = o.receiveShadow = true; if (o.material instanceof MeshStandardMaterial) { o.material = o.material.clone(); o.material.emissiveIntensity = 0; materials.push(o.material) } } })
      return obj
    }
    const pedestals = SUN_MIRRORS.map(m => copy(cradle.scene, m.x, m.z, 0.55))
    const bud = copy(plant.scene, SUN_PLANT.x, SUN_PLANT.z, 1.5)
    const budMaterials: MeshStandardMaterial[] = []
    bud.traverse(o => { if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) budMaterials.push(o.material) })
    const blocker = copy(rock.scene, SUN_BLOCKER.x, SUN_BLOCKER.z, 1.5)
    const ferns = [[20.6, -4.5], [27.2, -2.5], [21, 1], [27, 0.8]].map(([x, z], i) => { const f = copy(fern.scene, x, z, 0.85); f.rotation.y = i * 2.4; return f })
    return { pedestals, bud, budMaterials, blocker, ferns, materials }
  }, [cradle.scene, plant.scene, rock.scene, fern.scene])
  useEffect(() => () => items.materials.forEach(m => m.dispose()), [items])
  useFrame(() => {
    const g = route.sunlight.growth
    items.bud.scale.setScalar(1.2 + g * 0.4)
    items.budMaterials.forEach(m => { m.emissiveIntensity = 0.08 + g * 1.8 })
    items.ferns.forEach(f => { f.scale.setScalar(0.25 + g * 0.6) })
  })
  return <group name="Sunlight-Reused-Meshy-Props">{items.pedestals.map((p, i) => <primitive key={`pedestal-${i}`} object={p}/>)}<primitive object={items.bud}/><primitive object={items.blocker}/>{items.ferns.map((f, i) => <primitive key={`fern-${i}`} object={f}/>)}</group>
}
export function Sunlight({ player }: { player: Vector3 }) {
  return <><ReusedProps/><SunlightBanks/><SunlightOptics/><VineBridge/><SunlightDirector player={player}/></>
}
