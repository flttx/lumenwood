import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AdditiveBlending, Color, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Sprite, SpriteMaterial, Vector3, type WebGLProgramParametersWithUniforms } from 'three'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { lanternBrightness } from '../../features/route/Lanterns'
import { route, routeClock } from '../../features/route/progress'
import { zoneLanterns } from '../../features/route/routeLayout'
import { smoothstep } from '../../shared/math'
import { radialGlowTexture } from '../../features/flora/glowSprites'
import { heightAt } from '../terrain/terrain'
import { highlandRocks } from './forestLayout'
import { ANCIENT_TREE, PLATEAU_HEIGHT, TREE_BANDS } from './highlandLayout'
// Ancient Tree Highlands: the VEG-002 landmark and PRP-001 rock clusters. The tree lights up in height bands (roots, trunk,
// canopy), one per lit cradle, through a small shader patch on its own material. Meshy painted the amber light veins into
// the base colour but left the Emission map black, so the patch keys the veins out of the base colour (bright, strongly
// red-over-green texels) and makes them glow, masked by band; the canopy, which has no veins, gets a soft warm glow of its
// own. When the highland route completes, the canopy blazes for the ending under a large crown halo.
const TREE_URL = `${assetConfig.baseUrl}models/vegetation/VEG-002.glb`
const ROCK_URL = `${assetConfig.baseUrl}models/props/PRP-001.glb`
const VEIN_COLOR = new Color(0xffb04a), VEIN_INTENSITY = 7, CANOPY_COLOR = new Color(0xffd28a), CANOPY_TINT = 0xd9e2cc, ENDING_BLAZE = 3
export const CROWN_HEIGHT = 17
useGLTF.preload(TREE_URL, false, false)
useGLTF.preload(ROCK_URL, false, false)

/** How lit each band is: cradle `i` lights band `i`, easing in as its fireflies arrive. Returns 0..3. */
export function treeLayers(now: number) {
  return zoneLanterns('highland').reduce((sum, i) => sum + lanternBrightness(route.litAt[i], now), 0)
}

function AncientTree() {
  const { scene } = useGLTF(TREE_URL, false, false)
  const { mesh, uniforms } = useMemo(() => {
    const source = scene.getObjectByName('VEG-002')
    if (!(source instanceof Mesh) || !(source.material instanceof MeshStandardMaterial)) throw new Error(`${TREE_URL} has no standard mesh named VEG-002`)
    const material = source.material.clone()
    // Meshy rendered the foliage brighter and more lime than the reference; a light multiply brings it back to moss green.
    material.color.setHex(CANOPY_TINT)
    const uniforms = { uLayers: { value: 0 }, uCanopy: { value: 0 }, uCanopyColor: { value: CANOPY_COLOR }, uVeinColor: { value: VEIN_COLOR }, uVein: { value: 0 }, uTime: { value: 0 } }
    material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vTreeY;\nvarying vec3 vTreePos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTreeY = transformed.y;\nvTreePos = transformed;')
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTreeY;\nvarying vec3 vTreePos;\nuniform float uLayers;\nuniform float uCanopy;\nuniform vec3 uCanopyColor;\nuniform vec3 uVeinColor;\nuniform float uVein;\nuniform float uTime;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float band = smoothstep(${TREE_BANDS[0].toFixed(1)} - 0.6, ${TREE_BANDS[0].toFixed(1)} + 0.6, vTreeY) + smoothstep(${TREE_BANDS[1].toFixed(1)} - 0.8, ${TREE_BANDS[1].toFixed(1)} + 0.8, vTreeY);
  // Veins: bright amber texels (linear red high, green well below it); moss, leaves and bark fall outside this key.
  float vein = smoothstep(0.28, 0.55, diffuseColor.r) * smoothstep(1.5, 2.3, diffuseColor.r / max(diffuseColor.g, 0.02));
  // The painted veins are only a few texels wide at this resolution, so lit bark also carries procedural lines of light
  // winding up the trunk and roots. Bark texels are the ones where red clearly beats green; moss and leaves stay dark.
  float bark = smoothstep(1.05, 1.45, diffuseColor.r / max(diffuseColor.g, 0.02));
  float flow = sin(vTreePos.y * 1.6 + sin(vTreePos.x * 1.9) * 2.2 + sin(vTreePos.z * 1.7) * 2.2 - uTime * 0.6);
  float lines = smoothstep(0.9, 0.985, flow) + 0.04;
  totalEmissiveRadiance = uVeinColor * uVein * clamp(uLayers - band, 0.0, 1.0) * max(vein, bark * lines * 0.09);
  totalEmissiveRadiance += uCanopyColor * uCanopy * smoothstep(${(TREE_BANDS[1] - 1).toFixed(1)}, ${(TREE_BANDS[1] + 3).toFixed(1)}, vTreeY) * (0.25 + 0.75 * diffuseColor.g);`)
    }
    material.customProgramCacheKey = () => 'lumenwood-ancient-tree'
    const mesh = new Mesh(source.geometry, material)
    mesh.castShadow = mesh.receiveShadow = true
    return { mesh, uniforms }
  }, [scene])
  useEffect(() => () => { (mesh.material as MeshStandardMaterial).dispose() }, [mesh])
  useFrame(() => {
    const now = routeClock.now, layers = treeLayers(now), night = atmosphere.preset.lantern
    const done = route.completedAt.highland, blaze = done === null ? 0 : smoothstep(done + 2, done + 9, now)
    uniforms.uLayers.value = layers
    uniforms.uTime.value = now
    uniforms.uVein.value = VEIN_INTENSITY * (0.6 + 0.4 * night) * (1 + 0.5 * blaze)
    // The canopy band glows gently once lit, and blazes for the ending.
    uniforms.uCanopy.value = (0.35 * Math.max(0, Math.min(1, layers - 2)) + ENDING_BLAZE * 0.2 * blaze) * (0.5 + 0.5 * night)
  })
  return <><primitive object={mesh} position={[ANCIENT_TREE[0], PLATEAU_HEIGHT, ANCIENT_TREE[1]]}/><CrownHalo/></>
}

/** Large warm glow in the crown that swells with the ending blaze (no bloom pass; see task_plan decisions). */
function CrownHalo() {
  const { sprite, material } = useMemo(() => {
    const material = new SpriteMaterial({ map: radialGlowTexture(), color: CANOPY_COLOR, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false })
    const sprite = new Sprite(material)
    sprite.scale.setScalar(34); sprite.visible = false
    return { sprite, material }
  }, [])
  useFrame(() => {
    const done = route.completedAt.highland, now = routeClock.now
    const blaze = done === null ? 0 : smoothstep(done + 2, done + 9, now)
    sprite.visible = blaze > 0.01
    material.opacity = blaze * (0.45 + 0.05 * Math.sin(now * 1.3)) * (0.5 + 0.5 * atmosphere.preset.lantern)
  })
  return <primitive object={sprite} position={[ANCIENT_TREE[0], PLATEAU_HEIGHT + CROWN_HEIGHT, ANCIENT_TREE[1]]}/>
}

function Rocks() {
  const { scene } = useGLTF(ROCK_URL, false, false)
  const instanced = useMemo(() => {
    const source = scene.getObjectByName('PRP-001')
    if (!(source instanceof Mesh)) throw new Error(`${ROCK_URL} has no mesh named PRP-001`)
    const mesh = new InstancedMesh(source.geometry, source.material, highlandRocks.length), up = new Vector3(0, 1, 0)
    highlandRocks.forEach((r, i) => mesh.setMatrixAt(i, new Matrix4().compose(new Vector3(r.x, heightAt(r.x, r.z) - 0.05, r.z), new Quaternion().setFromAxisAngle(up, r.angle), new Vector3(r.scale, r.scale, r.scale))))
    mesh.castShadow = mesh.receiveShadow = true
    mesh.computeBoundingSphere()
    return mesh
  }, [scene])
  return <primitive object={instanced}/>
}

export function Highland() {
  return <><AncientTree/><Rocks/></>
}
