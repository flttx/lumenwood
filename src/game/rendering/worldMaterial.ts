import { Color, Vector2, Vector3, type Material, type MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from 'three'
// Shared shader patch for the Meshy scenery materials (third visual pass, 2026-11-12). The concept boards' canopies glow
// when backlit and read soft at their edges; the Meshy foliage is hard faceted cards with a single texture. The patch:
// - finds "leaf" texels by colour (green over red and blue), so bark, stone and wood are left alone;
// - lets sunlight through the leaves when looking toward the sun (translucency), and adds a sky-coloured rim at grazing
//   angles so canopies separate from each other;
// - darkens toward the foot of tall plants (canopy occlusion) and sways the upper part with the shared global wind field.
// All instances share `worldUniforms`, updated once per frame (Atmosphere).
export const worldUniforms = {
  uTime: { value: 0 },
  /** Sun direction in view space (towards the sun). */
  uSunView: { value: new Vector3(0, 1, 0) },
  uSunColor: { value: new Color() },
  uRimColor: { value: new Color() },
  uTranslucency: { value: 1 },
  uDaylight: { value: 1 },
  uFocusView: { value: new Vector3() },
  uWindDir: { value: new Vector2(0.86, 0.5) },
  uWindGust: { value: 0.4 },
}

export interface FoliageOptions {
  /** Object-space height of the model (sway and occlusion are relative to it). */
  height: number
  /** Sway at the top, as a fraction of the height. */
  sway: number
  cameraFade?: boolean
}

const vertexPars = `#include <common>
uniform float uTime; uniform float uFoliageHeight; uniform float uFoliageSway; uniform vec2 uWindDir; uniform float uWindGust; varying float vFoliageK;`
const vertexBody = `#include <begin_vertex>
  vFoliageK = clamp(position.y / uFoliageHeight, 0.0, 1.0);
  vec3 foliageAnchor = vec3(0.0);
  #ifdef USE_INSTANCING
    foliageAnchor = instanceMatrix[3].xyz;
  #endif
  float foliagePhase = dot(foliageAnchor.xz, uWindDir * 0.11);
  float gustWave = sin(uTime * (0.85 + 0.4 * uWindGust) - foliagePhase) * (0.65 + 0.55 * uWindGust)
                 + sin(uTime * 2.15 - foliagePhase * 1.7 + position.y * 0.35) * (0.18 + 0.14 * uWindGust);
  vec2 windPerp = vec2(-uWindDir.y, uWindDir.x);
  vec2 disp = uWindDir * gustWave + windPerp * (0.18 * sin(uTime * 1.4 + foliageAnchor.x * 0.23));
  transformed.xz += disp * uFoliageSway * uFoliageHeight * vFoliageK * vFoliageK;`
const fragmentPars = `#include <common>
uniform vec3 uSunView; uniform vec3 uSunColor; uniform vec3 uRimColor; uniform vec3 uFocusView; uniform float uTranslucency; uniform float uDaylight; uniform float uCameraFade; varying float vFoliageK;`
const colorBody = `#include <color_fragment>
  float leaf = smoothstep(0.015, 0.09, diffuseColor.g - max(diffuseColor.r, diffuseColor.b) * 0.92);
  // Day keeps green leaf pigment under cream sunlight; bark and evening palettes retain their texture colours.
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.82, 1.1, 0.94), leaf * uDaylight);
  if (uCameraFade > 0.5) {
    vec3 leafView = -vViewPosition;
    float along = dot(leafView, uFocusView) / max(dot(uFocusView, uFocusView), 0.01);
    float corridor = length(leafView - uFocusView * clamp(along, 0.0, 1.0));
    float obstruction = (1.0 - smoothstep(0.55, 1.25, corridor)) * step(0.0, along) * (1.0 - step(1.05, along));
    float visibility = mix(1.0, min(smoothstep(0.45, 1.8, length(vViewPosition)), 1.0 - obstruction * 0.9), leaf);
    float pixelNoise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (pixelNoise > visibility) discard;
  }
  diffuseColor.rgb *= mix(0.62, 1.06, smoothstep(0.0, 0.8, vFoliageK));`
const emissiveBody = `#include <emissivemap_fragment>
  vec3 foliageView = normalize(-vViewPosition); // camera → fragment, view space
  float backlit = pow(max(dot(foliageView, uSunView), 0.0), 4.0); // looking into the sun through the leaves
  totalEmissiveRadiance += diffuseColor.rgb * uSunColor * backlit * leaf * uTranslucency * (0.6 + 0.6 * vFoliageK);
  float rim = pow(clamp(1.0 - abs(dot(normal, foliageView)), 0.0, 1.0), 3.0);
  totalEmissiveRadiance += uRimColor * rim * leaf * 0.22 * diffuseColor.rgb * 3.0;`

/** Patches a Meshy material once (idempotent); if a later consumer enables cameraFade, promotes the shared uniform. */
export function applyFoliage(material: Material, options: FoliageOptions) {
  const existing = material.userData.foliageUniforms as { uFoliageHeight: { value: number }; uFoliageSway: { value: number }; uCameraFade: { value: number } } | undefined
  if (existing) {
    if (options.cameraFade) existing.uCameraFade.value = 1
    return
  }
  material.userData.foliage = true
  const m = material as MeshStandardMaterial
  const own = { uFoliageHeight: { value: options.height }, uFoliageSway: { value: options.sway }, uCameraFade: { value: options.cameraFade ? 1 : 0 } }
  material.userData.foliageUniforms = own
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, worldUniforms, own)
    shader.vertexShader = shader.vertexShader.replace('#include <common>', vertexPars).replace('#include <begin_vertex>', vertexBody)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', fragmentPars)
      .replace('#include <color_fragment>', colorBody).replace('#include <emissivemap_fragment>', emissiveBody)
  }
  m.customProgramCacheKey = () => 'lumenwood-foliage'
  m.needsUpdate = true
}
