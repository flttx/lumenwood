import { MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from 'three'
import { BEACH } from '../regions'
import { SEA_LEVEL } from './terrain'
import { surfGLSL, surfTime } from './surf'
import { worldUniforms } from '../../rendering/worldMaterial'
import { WATERFALL } from '../zones/sideLayout'

// World-space forest floor, triplanar cliff stone, and wet coastal sand detail with full normal relief and dynamic PBR roughness.
export function createGroundMaterial() {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 })
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSurfTime = surfTime
    shader.uniforms.uDaylight = worldUniforms.uDaylight
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSandWorld;\nvarying vec3 vGroundNormal;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSandWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvGroundNormal = normalize(mat3(modelMatrix) * normal);')
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
      // Analytic value-noise value + 2D derivative (zero 2x2 pixel quad staircasing).
      vec3 sandNoiseD(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
        float a = sandHash(cell), b = sandHash(cell + vec2(1.0, 0.0));
        float c = sandHash(cell + vec2(0.0, 1.0)), d = sandHash(cell + vec2(1.0, 1.0));
        float v = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        vec2 g = du * vec2((b - a) + (a - b - c + d) * u.y, (c - a) + (a - b - c + d) * u.x);
        return vec3(v, g);
      }
      // Natural stratified cliff rock: returns vec3(tone, dHeight/du, dHeight/dv) smoothly per pixel.
      vec3 sampleRock2D(vec2 p) {
        vec2 warp = vec2(sandNoise(p * 0.18 + 3.1), sandNoise(p * 0.22 + 14.7)) - 0.5;
        vec2 q = p + warp * 1.35;
        vec3 n1 = sandNoiseD(q * 0.34);
        vec3 n2 = sandNoiseD(q * 0.85 + vec2(7.3, 2.9));
        vec3 n3 = sandNoiseD(q * 2.15 + vec2(-4.1, 9.2));
        float fine = sandNoise(q * 5.2);
        float strataPhase = q.y * 1.45 + n1.x * 3.4;
        float strata = 0.5 + 0.5 * sin(strataPhase);
        float strataDeriv = 0.5 * cos(strataPhase);
        vec2 strataGrad = vec2(strataDeriv * n1.y * 3.4 * 0.34, strataDeriv * (1.45 + n1.z * 3.4 * 0.34));
        float ridge = 1.0 - abs(n2.x * 2.0 - 1.0);
        vec2 ridgeGrad = -sign(n2.x * 2.0 - 1.0) * 2.0 * n2.yz * 0.85;
        float tone = clamp(n1.x * 0.44 + strata * 0.22 + ridge * 0.2 + fine * 0.14, 0.0, 1.0);
        vec2 grad = n1.yz * 0.34 * 0.55 + strataGrad * 0.24 + ridgeGrad * 0.14 + n3.yz * 2.15 * 0.09;
        return vec3(tone, grad);
      }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec2 sandPos = vSandWorld.xz;
      vec3 worldN = normalize(vGroundNormal);
      vec3 absN = abs(worldN);
      float footprint = max(fwidth(sandPos.x), fwidth(sandPos.y));
      float fine = 1.0 - smoothstep(0.04, 0.35, footprint);
      float groundUp = smoothstep(0.35, 0.85, absN.y);
      float forest = smoothstep(${(SEA_LEVEL + 1.2).toFixed(2)}, ${(SEA_LEVEL + 2.8).toFixed(2)}, vSandWorld.y);
      float broadMacro = sandNoise(sandPos * 0.085 + 4.3);
      vec3 midN = sandNoiseD(sandPos * 3.2 + 12.0);
      vec3 macroN = sandNoiseD(sandPos * 0.95);
      float mottling = macroN.x * 0.55 + midN.x * 0.45;
      float soil = sandNoise(sandPos * 16.0);
      float moss = smoothstep(0.4, 0.72, sandNoise(sandPos * 0.45 + 3.0) * 0.65 + broadMacro * 0.35) * groundUp;
      // Richer macro hill variation breaks up uniform green slopes in mid-far views.
      diffuseColor.rgb *= 1.0 + forest * ((broadMacro - 0.5) * 0.26 + (mottling - 0.5) * 0.3 + (soil - 0.5) * 0.13 * fine);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.78, 1.1, 0.72), moss * forest * 0.36);
      float livingFloor = smoothstep(0.01, 0.09, diffuseColor.g - diffuseColor.r);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.84, 1.1, 0.92), livingFloor * uDaylight * forest * groundUp);
      // True triplanar stratified stone on cliffs and mid-steep hillside scree — smooth analytic normals, zero seams.
      float steep = 1.0 - smoothstep(0.58, 0.9, absN.y);
      float midSlope = (1.0 - smoothstep(0.76, 0.95, absN.y)) * (1.0 - steep);
      vec3 rockWorldGrad = vec3(0.0);
      float gRoughness = 0.93;
      if ((steep + midSlope * 0.5) * forest > 0.01) {
        vec3 triW = pow(absN, vec3(4.0));
        triW /= max(triW.x + triW.y + triW.z, 1e-4);
        vec3 rx = sampleRock2D(vec2(vSandWorld.z, vSandWorld.y));
        vec3 rz = sampleRock2D(vec2(vSandWorld.x, vSandWorld.y));
        vec3 ry = sampleRock2D(vSandWorld.xz * 0.85);
        float rockTone = rx.x * triW.x + ry.x * triW.y + rz.x * triW.z;
        rockWorldGrad = vec3(
          rz.y * triW.z + ry.y * 0.85 * triW.y,
          rx.z * triW.x + rz.z * triW.z,
          rx.y * triW.x + ry.z * 0.85 * triW.y
        );
        float weather = smoothstep(0.36, 0.76, sandNoise(vec2((vSandWorld.x + vSandWorld.z) * 0.38, vSandWorld.y * 0.12)));
        vec3 rockDark = vec3(0.12, 0.125, 0.13);
        vec3 rockWarm = vec3(0.32, 0.295, 0.25);
        vec3 exposed = mix(rockDark, rockWarm, rockTone);
        exposed *= 1.0 - weather * 0.16;
        // Moss clings to upward-facing cliff ledges and shelves.
        float ledgeMoss = smoothstep(0.28, 0.62, worldN.y) * smoothstep(0.36, 0.68, rockTone);
        exposed = mix(exposed, vec3(0.16, 0.24, 0.13), ledgeMoss * 0.65);
        // Soaked dark sheen behind & beside the glen waterfall.
        float wfDist = length(vec2(vSandWorld.x - ${(WATERFALL.x - 0.5).toFixed(2)}, (vSandWorld.z - ${WATERFALL.z.toFixed(2)}) * 0.65));
        float wfWet = (1.0 - smoothstep(3.5, 11.5, wfDist)) * smoothstep(-1.5, 16.5, vSandWorld.y);
        exposed *= 1.0 - wfWet * 0.38;
        float rockMask = clamp((steep * 0.96 + midSlope * smoothstep(0.32, 0.74, rockTone) * 0.52) * forest, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, exposed, rockMask);
        gRoughness = mix(gRoughness, mix(0.86, 0.26, wfWet) - rockTone * 0.06, rockMask);
      }
      // Subtle earthy scree & exposed roots along hillside transitions.
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.19, 0.14), midSlope * forest * smoothstep(0.55, 0.85, mottling) * 0.25);
      // Sparse, small fallen leaves embedded in the soil, filtered away before their shapes become sub-pixel noise.
      vec2 leafCell = floor(sandPos * 2.8), leafUV = fract(sandPos * 2.8) - 0.5;
      float leafSeed = sandHash(leafCell + 18.0), leafAngle = leafSeed * 37.0;
      leafUV = mat2(cos(leafAngle), -sin(leafAngle), sin(leafAngle), cos(leafAngle)) * leafUV;
      float leafShape = length(leafUV * vec2(5.6, 3.4));
      float leaf = (1.0 - smoothstep(0.75, 1.0, leafShape)) * step(0.93, leafSeed) * forest * fine * groundUp;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.072, 0.034) * (0.8 + leafSeed * 0.35), leaf * 0.45);
      // Coastal cove sand: dry wind-rippled sand + glossy wet swash zone that mirrors sky light via PMREM IBL.
      float cove = (1.0 - smoothstep(${(BEACH.maxX + 2).toFixed(1)}, ${(BEACH.maxX + 18).toFixed(1)}, abs(sandPos.x)))
        * (1.0 - smoothstep(${(BEACH.maxZ - 5).toFixed(1)}, ${(BEACH.maxZ + 2).toFixed(1)}, sandPos.y));
      vec2 sandGrad = vec2(0.0);
      if (cove > 0.001) {
        float beach = cove * smoothstep(${(SEA_LEVEL - 0.35).toFixed(2)}, ${(SEA_LEVEL + 0.25).toFixed(2)}, vSandWorld.y);
        float wet = 1.0 - smoothstep(${(SEA_LEVEL + 0.18).toFixed(2)}, ${(SEA_LEVEL + 1.05).toFixed(2)}, vSandWorld.y + (sandNoise(sandPos * 0.3) - 0.5) * 0.2);
        float broadSand = sandNoise(sandPos * 0.35);
        float grains = sandNoise(sandPos * 4.5);
        float ripplePhase = dot(sandPos, vec2(2.8, 4.1)) + sandNoise(sandPos * 0.32) * 5.0;
        float ripple = sin(ripplePhase);
        sandGrad = cos(ripplePhase) * vec2(2.8, 4.1) * 0.015 * (1.0 - wet) * beach;
        float variation = (broadSand - 0.5) * 0.14 + (grains - 0.5) * 0.13 * fine + ripple * 0.04 * fine * (1.0 - wet);
        vec3 sandTint = vec3(0.56, 0.44, 0.29) * (0.9 + broadSand * 0.18);
        diffuseColor.rgb = mix(diffuseColor.rgb, sandTint, beach * 0.44);
        diffuseColor.rgb *= 1.0 + variation * beach;
        float surge = coveSurge(sandPos, uSurfTime);
        float recentWater = mix(surge, 0.24 * cove, 0.48);
        float damp = (1.0 - smoothstep(${(SEA_LEVEL + 0.08).toFixed(2)} + recentWater, ${(SEA_LEVEL + 0.34).toFixed(2)} + recentWater, vSandWorld.y)) * cove;
        float wetness = clamp(max(wet * 0.72, damp), 0.0, 1.0) * beach;
        diffuseColor.rgb *= 1.0 - wetness * 0.3;
        gRoughness = mix(gRoughness, mix(0.78, 0.2, wetness), beach);
      }
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(gRoughness, 0.16, 0.98);
    `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      float detailFilter = 1.0 - smoothstep(0.05, 0.42, footprint);
      float rockFilter = 1.0 - smoothstep(0.18, 1.8, max(length(fwidth(vSandWorld)), 1e-4));
      vec2 floorG = (macroN.yz * 0.06 + midN.yz * 0.045 + sandGrad) * detailFilter * groundUp;
      vec3 worldBump = vec3(floorG.x, 0.0, floorG.y) + rockWorldGrad * 0.42 * rockFilter * (steep + midSlope * 0.45);
      // Project world-space gradient onto surface tangent plane and transform to view space smoothly per pixel.
      worldBump -= worldN * dot(worldBump, worldN);
      vec3 viewBump = (viewMatrix * vec4(worldBump, 0.0)).xyz;
      normal = normalize(normal - viewBump);
    `)
  }
  material.customProgramCacheKey = () => 'lumenwood-ground-forest-v7'
  return material
}
