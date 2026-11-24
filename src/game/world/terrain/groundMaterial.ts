import { MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from 'three'
import { BEACH } from '../regions'
import { SEA_LEVEL } from './terrain'
import { surfGLSL, surfTime } from './surf'
import { worldUniforms } from '../../rendering/worldMaterial'

// World-space forest floor and sand detail supplement the terrain's coarse vertex colours; no extra terrain meshes.
export function createGroundMaterial() {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1 })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSurfTime = surfTime
    shader.uniforms.uDaylight = worldUniforms.uDaylight
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSandWorld;\nvarying vec3 vGroundNormal;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSandWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvGroundNormal = abs(normal);')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vSandWorld;
      varying vec3 vGroundNormal;
      uniform float uSurfTime;
      uniform float uDaylight;
      ${surfGLSL}
      float sandHash(vec2 p) { return fract(sin(dot(p, vec2(91.71, 53.17))) * 31973.41); }
      float sandNoise(vec2 p) {
        vec2 cell = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(sandHash(cell), sandHash(cell + vec2(1.0, 0.0)), f.x),
                   mix(sandHash(cell + vec2(0.0, 1.0)), sandHash(cell + vec2(1.0)), f.x), f.y);
      }
      float stoneJoint(vec2 p) {
        vec2 cell = floor(p), local = fract(p);
        float first = 8.0, second = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 seed = cell + offset;
          vec2 point = offset + 0.18 + 0.64 * vec2(sandHash(seed), sandHash(seed + 31.7)) - local;
          float d = dot(point, point);
          if (d < first) { second = first; first = d; } else second = min(second, d);
        }
        return 1.0 - smoothstep(0.02, 0.09, sqrt(second) - sqrt(first));
      }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec2 sandPos = vSandWorld.xz;
      float footprint = max(fwidth(sandPos.x), fwidth(sandPos.y));
      float fine = 1.0 - smoothstep(0.04, 0.3, footprint);
      float groundUp = smoothstep(0.35, 0.85, vGroundNormal.y);
      vec2 floorDetail = sandPos;
      float forest = smoothstep(${(SEA_LEVEL + 1.4).toFixed(2)}, ${(SEA_LEVEL + 3.0).toFixed(2)}, vSandWorld.y);
      float midNoise = sandNoise(floorDetail * 4.8 + 12.0);
      float mottling = sandNoise(floorDetail * 1.6) * 0.65 + midNoise * 0.35;
      float soil = sandNoise(floorDetail * 19.0);
      float moss = smoothstep(0.45, 0.7, sandNoise(floorDetail * 0.55 + 3.0)) * groundUp;
      diffuseColor.rgb *= 1.0 + forest * ((mottling - 0.5) * 0.35 + (soil - 0.5) * 0.13 * fine);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.82, 1.08, 0.75), moss * forest * 0.3);
      float livingFloor = smoothstep(0.01, 0.09, diffuseColor.g - diffuseColor.r);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.83, 1.08, 0.94), livingFloor * uDaylight * forest * groundUp);
      // Steep carriers expose layered stone on both ±X cliffs and ±Z ravine/ramp slopes without smearing.
      float steep = 1.0 - smoothstep(0.65, 0.9, vGroundNormal.y);
      if (steep * forest > 0.01) {
        vec2 sidePos = vGroundNormal.x > vGroundNormal.z ? vec2(vSandWorld.z, vSandWorld.y) : vec2(vSandWorld.x, vSandWorld.y);
        vec2 stonePos = sidePos + vec2(sandNoise(sidePos * 0.25), sandNoise(sidePos * 0.35 + 9.0)) * 0.75;
        float rockNoise = sandNoise(stonePos * 0.95) * 0.55 + sandNoise(stonePos * 4.2) * 0.3 + sandNoise(stonePos * 12.0) * 0.15;
        float strata = 0.5 + 0.5 * sin(stonePos.y * 2.4 + sandNoise(stonePos * 0.55) * 3.0);
        float joint = stoneJoint(stonePos * vec2(0.85, 1.15) + vec2(stonePos.y * 0.12, 0.0));
        float weather = smoothstep(0.42, 0.75, sandNoise(vec2(stonePos.x * 1.4, stonePos.y * 0.18)));
        vec3 exposed = mix(vec3(0.11, 0.12, 0.115), vec3(0.27, 0.255, 0.215), rockNoise * 0.78 + strata * 0.22);
        exposed *= 1.0 - joint * 0.11 - weather * 0.12;
        diffuseColor.rgb = mix(diffuseColor.rgb, exposed, steep * forest * 0.95);
      }
      // Sparse, small fallen leaves embedded in the soil, filtered away before their shapes become sub-pixel noise.
      vec2 leafCell = floor(sandPos * 2.8), leafUV = fract(sandPos * 2.8) - 0.5;
      float leafSeed = sandHash(leafCell + 18.0), leafAngle = leafSeed * 37.0;
      leafUV = mat2(cos(leafAngle), -sin(leafAngle), sin(leafAngle), cos(leafAngle)) * leafUV;
      float leafShape = length(leafUV * vec2(5.6, 3.4));
      float leaf = (1.0 - smoothstep(0.75, 1.0, leafShape)) * step(0.93, leafSeed) * forest * fine * groundUp;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.07, 0.033) * (0.8 + leafSeed * 0.35), leaf * 0.45);
      float cove = (1.0 - smoothstep(${(BEACH.maxX + 2).toFixed(1)}, ${(BEACH.maxX + 18).toFixed(1)}, abs(sandPos.x)))
        * (1.0 - smoothstep(${(BEACH.maxZ - 5).toFixed(1)}, ${(BEACH.maxZ + 2).toFixed(1)}, sandPos.y));
      if (cove > 0.001) {
        float beach = cove * smoothstep(${(SEA_LEVEL - 0.1).toFixed(2)}, ${(SEA_LEVEL + 0.25).toFixed(2)}, vSandWorld.y);
        float wet = 1.0 - smoothstep(${(SEA_LEVEL + 0.18).toFixed(2)}, ${(SEA_LEVEL + 0.85).toFixed(2)}, vSandWorld.y + (sandNoise(sandPos * 0.3) - 0.5) * 0.18);
        float broadSand = sandNoise(sandPos * 0.35);
        float grains = sandNoise(sandPos * 4.2);
        float ripple = sin(dot(sandPos, vec2(2.8, 4.1)) + sandNoise(sandPos * 0.32) * 5.0);
        float variation = (broadSand - 0.5) * 0.12 + (grains - 0.5) * 0.12 * fine + ripple * 0.035 * fine * (1.0 - wet);
        vec3 sandTint = vec3(0.52, 0.40, 0.26) * (0.92 + broadSand * 0.16);
        diffuseColor.rgb = mix(diffuseColor.rgb, sandTint, beach * 0.4);
        diffuseColor.rgb *= 1.0 + variation * beach;
        float surge = coveSurge(sandPos, uSurfTime);
        float recentWater = mix(surge, 0.22 * cove, 0.45);
        float damp = (1.0 - smoothstep(${(SEA_LEVEL + 0.06).toFixed(2)} + recentWater, ${(SEA_LEVEL + 0.24).toFixed(2)} + recentWater, vSandWorld.y)) * cove;
        diffuseColor.rgb *= 1.0 - max(wet * 0.12, damp * 0.18) * beach;
      }
    `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float detailFilter = 1.0 - smoothstep(0.03, 0.18, footprint);
      float relief = (midNoise * 0.012 + soil * 0.003) * detailFilter;
      vec3 surfaceX = dFdx(-vViewPosition), surfaceY = dFdy(-vViewPosition);
      vec3 r1 = cross(surfaceY, normal), r2 = cross(normal, surfaceX);
      float determinant = dot(surfaceX, r1);
      vec3 gradient = sign(determinant) * (dFdx(relief) * r1 + dFdy(relief) * r2);
      vec3 floorNormal = normalize(max(abs(determinant), 0.000001) * normal - gradient);
      normal = normalize(mix(normal, floorNormal, groundUp));
    `)
  }
  material.customProgramCacheKey = () => 'lumenwood-ground-forest-v5'
  return material
}
