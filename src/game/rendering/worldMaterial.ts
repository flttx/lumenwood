import { Color, Vector3, type Material, type MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from 'three'
// Shared shader patch for the Meshy scenery materials (third visual pass, 2026-11-12). The concept boards' canopies glow
// when backlit and read soft at their edges; the Meshy foliage is hard faceted cards with a single texture. The patch:
// - finds "leaf" texels by colour (green over red and blue), so bark, stone and wood are left alone;
// - lets sunlight through the leaves when looking toward the sun (translucency), and adds a sky-coloured rim at grazing
//   angles so canopies separate from each other;
// - darkens toward the foot of tall plants (canopy occlusion) and sways the upper part in the wind.
// All instances share `worldUniforms`, updated once per frame (WorldUniformsDriver in Atmosphere).
export const worldUniforms = {
  uTime: { value: 0 },
  /** Sun direction in view space (towards the sun). */
  uSunView: { value: new Vector3(0, 1, 0) },
  uSunColor: { value: new Color() },
  uRimColor: { value: new Color() },
  uTranslucency: { value: 1 },
}

export interface FoliageOptions {
  /** Object-space height of the model (sway and occlusion are relative to it). */
  height: number
  /** Sway at the top, as a fraction of the height. */
  sway: number
}

const vertexPars = `#include <common>
uniform float uTime; uniform float uFoliageHeight; uniform float uFoliageSway; varying float vFoliageK;`
const vertexBody = `#include <begin_vertex>
  vFoliageK = clamp(position.y / uFoliageHeight, 0.0, 1.0);
  vec3 foliageAnchor = vec3(0.0);
  #ifdef USE_INSTANCING
    foliageAnchor = instanceMatrix[3].xyz;
  #endif
  float foliagePhase = dot(foliageAnchor.xz, vec2(0.13, 0.17));
  float foliageWave = sin(uTime * 0.8 + foliagePhase) * 0.65 + sin(uTime * 2.1 + foliagePhase * 1.7 + position.y * 0.35) * 0.2;
  transformed.xz += vec2(1.0, 0.6) * foliageWave * uFoliageSway * uFoliageHeight * vFoliageK * vFoliageK;`
const fragmentPars = `#include <common>
uniform vec3 uSunView; uniform vec3 uSunColor; uniform vec3 uRimColor; uniform float uTranslucency; varying float vFoliageK;`
const colorBody = `#include <color_fragment>
  float leaf = smoothstep(0.015, 0.09, diffuseColor.g - max(diffuseColor.r, diffuseColor.b) * 0.92);
  diffuseColor.rgb *= mix(0.62, 1.06, smoothstep(0.0, 0.8, vFoliageK));`
const emissiveBody = `#include <emissivemap_fragment>
  vec3 foliageView = normalize(-vViewPosition); // camera → fragment, view space
  float backlit = pow(max(dot(foliageView, uSunView), 0.0), 4.0); // looking into the sun through the leaves
  totalEmissiveRadiance += diffuseColor.rgb * uSunColor * backlit * leaf * uTranslucency * (0.6 + 0.6 * vFoliageK);
  float rim = pow(clamp(1.0 - abs(dot(normal, foliageView)), 0.0, 1.0), 3.0);
  totalEmissiveRadiance += uRimColor * rim * leaf * 0.22 * diffuseColor.rgb * 3.0;`

/** Patches a Meshy material once (idempotent); safe to call for every mesh that shares it. */
export function applyFoliage(material: Material, options: FoliageOptions) {
  if (material.userData.foliage) return
  material.userData.foliage = true
  const m = material as MeshStandardMaterial
  const own = { uFoliageHeight: { value: options.height }, uFoliageSway: { value: options.sway } }
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, worldUniforms, own)
    shader.vertexShader = shader.vertexShader.replace('#include <common>', vertexPars).replace('#include <begin_vertex>', vertexBody)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', fragmentPars)
      .replace('#include <color_fragment>', colorBody).replace('#include <emissivemap_fragment>', emissiveBody)
  }
  m.customProgramCacheKey = () => 'lumenwood-foliage'
  m.needsUpdate = true
}
