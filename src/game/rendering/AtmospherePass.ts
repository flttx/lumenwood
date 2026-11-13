import { Color, HalfFloatType, Matrix4, ShaderMaterial, Vector2, Vector3, Vector4, WebGLRenderTarget, type PerspectiveCamera, type Texture, type WebGLRenderer } from 'three'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import { SEA_LEVEL } from '../world/terrain/terrain'
// Depth-aware atmosphere (third visual pass, 2026-11-12). Runs on the HDR scene right after it renders, reading its depth:
// - low mist: exponential height fog that pools in hollows and over water, thinning with height (the concept boards'
//   ground mist), coloured toward the sun when looking into it (in-scattering);
// - light shafts: a radial blur toward the sun of the sky pixels that show between trunks and leaves (depth = far), at
//   half resolution, so the canopy cuts the low sun into rays (the boards' god rays).
// - colour restoration (features/route/revive.ts): outside the restored circles the world is faded and slightly cool; a
//   warm wavefront runs along each circle's edge while it grows.
// Values come from the time-of-day preset (mist, mistFalloff, rays); `rays` 0 skips the half-resolution pass.
const RAY_SAMPLES = 40
export const MAX_CIRCLES = 40

const vertexShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
const depthHelpers = `uniform sampler2D tDepth; uniform mat4 uProjInv; uniform mat4 uCamWorld;
vec3 worldAt(vec2 uv, float depth) {
  vec4 view = uProjInv * vec4(vec3(uv, depth) * 2.0 - 1.0, 1.0);
  return (uCamWorld * vec4(view.xyz / view.w, 1.0)).xyz;
}`
const raysShader = `${depthHelpers}
uniform sampler2D tDiffuse; uniform vec2 uSun; varying vec2 vUv;
void main() {
  vec2 delta = (uSun - vUv) / float(${RAY_SAMPLES});
  vec2 uv = vUv; float decay = 1.0, sum = 0.0;
  for (int i = 0; i < ${RAY_SAMPLES}; i++) {
    uv += delta;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
    float sky = step(0.99999, texture2D(tDepth, uv).r);
    vec3 c = texture2D(tDiffuse, uv).rgb;
    // Only sky near the sun (or moon) feeds the shafts: transparent glows drawn over the sky without depth (the ancient
    // tree's beacon) otherwise smeared into a glow across the whole frame.
    float near = 1.0 - smoothstep(0.04, 0.22, distance(uv, uSun));
    sum += sky * near * min(dot(c, vec3(0.3, 0.5, 0.2)), 1.5) * decay;
    decay *= 0.975;
  }
  // Shafts fade with distance from the sun on screen, so a low sun through a gap never floods the frame.
  float reach = 1.0 - smoothstep(0.05, 0.75, distance(vUv, uSun));
  gl_FragColor = vec4(vec3(sum / float(${RAY_SAMPLES}) * reach), 1.0);
}`
const compositeShader = `${depthHelpers}
uniform sampler2D tDiffuse; uniform sampler2D tRays; uniform vec3 uCamPos; uniform vec3 uSunDir; uniform vec3 uSunColor;
uniform vec3 uMistColor; uniform float uMist; uniform float uFalloff; uniform float uBase; uniform float uRays; uniform float uRaysOn;
uniform vec4 uRevive[${MAX_CIRCLES}]; uniform int uReviveCount; uniform float uReviveAll; uniform float uFaded; uniform vec3 uWave;
uniform float uCloud; uniform float uTime;
varying vec2 vUv;
float cloudHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cloudNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cloudHash(i), cloudHash(i + vec2(1, 0)), f.x), mix(cloudHash(i + vec2(0, 1)), cloudHash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  float depth = texture2D(tDepth, vUv).r;
  vec3 p = worldAt(vUv, min(depth, 0.9999)); // the far plane itself would divide by zero
  vec3 ray = p - uCamPos; float dist = length(ray); vec3 dir = ray / max(dist, 1e-4);
  float toward = max(dot(dir, uSunDir), 0.0);
  if (depth < 0.99999) {
    // The sea (at or below sea level) is never faded: only the island waits for its light.
    float alive = max(uReviveAll, step(p.y, ${SEA_LEVEL.toFixed(2)} + 0.3)), front = 0.0;
    for (int i = 0; i < ${MAX_CIRCLES}; i++) {
      if (i >= uReviveCount) break;
      vec4 c = uRevive[i]; float d = distance(p.xz, c.xy);
      alive = max(alive, 1.0 - smoothstep(c.z * 0.72, c.z, d));
      front += (1.0 - smoothstep(0.0, 1.2 + c.z * 0.04, abs(d - c.z))) * c.w;
    }
    // Cloud shadows (third pass): large soft patches drifting across the land on sunny afternoons.
    if (uCloud > 0.001) {
      vec2 cp = p.xz * 0.012 + vec2(uTime * 0.012, uTime * 0.005);
      float c = cloudNoise(cp) * 0.65 + cloudNoise(cp * 2.3 + 7.0) * 0.35;
      col *= 1.0 - uCloud * smoothstep(0.5, 0.72, c);
    }
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 faded = mix(vec3(luma), col, 0.42) * vec3(0.88, 0.93, 1.04);
    col = mix(mix(col, faded, uFaded), col, alive);
    col += uWave * min(front, 1.0) * (0.25 + luma);
    // Density uMist * exp(-uFalloff * (h - uBase)) taken at the ray's mean height, floored a little below the base: the
    // exact integral grows without bound for ground far below the camera (the sea under the overlook went solid haze).
    float mean = 0.5 * (uCamPos.y + p.y) - uBase;
    // Mist is a near effect (low-lying, tens of metres); the scene fog takes over for distance.
    float amount = 1.0 - exp(-uMist * exp(-uFalloff * max(mean, -1.5)) * min(dist, 45.0));
    amount *= p.y < ${SEA_LEVEL.toFixed(2)} + 0.3 ? 0.15 : 1.0; // the open sea keeps its colour (it has its own haze)
    vec3 mist = mix(uMistColor, uSunColor * 1.3, pow(toward, 8.0) * 0.5);
    col = mix(col, mist, clamp(amount, 0.0, 0.7));
  }
  if (uRaysOn > 0.5) col += texture2D(tRays, vUv).r * uSunColor * uRays;
  // A NaN or infinite pixel (a shader dividing by ~0 somewhere) would smear across the frame through bloom; drop it here.
  // Checked on the bit pattern (exponent all ones): isnan()/isinf() can be optimised away by fast-math shader compilers.
  uvec3 bits = floatBitsToUint(col) & uvec3(0x7f800000u);
  if (any(equal(bits, uvec3(0x7f800000u)))) col = vec3(0.0);
  gl_FragColor = vec4(min(col, vec3(6e4)), 1.0);
}`

export class AtmospherePass extends Pass {
  readonly settings = { mist: 0, falloff: 0.2, rays: 0, raysOn: true, mistColor: new Color(), sunColor: new Color(), sunDir: new Vector3(0, 1, 0),
    /** Restored circles (x, z, radius, wavefront), how many are used, whole-world restoration, and how faded the rest is. */
    revive: new Float32Array(MAX_CIRCLES * 4), reviveCount: 0, reviveAll: 0, faded: 0,
    /** How dark the drifting cloud shadows are (0 none). */
    cloud: 0, time: 0 }
  private readonly reviveVectors = Array.from({ length: MAX_CIRCLES }, () => new Vector4())
  private readonly raysTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
  private readonly raysMaterial: ShaderMaterial
  private readonly compositeMaterial: ShaderMaterial
  private readonly raysQuad: FullScreenQuad
  private readonly compositeQuad: FullScreenQuad
  private readonly sunScreen = new Vector3()
  constructor(private readonly camera: PerspectiveCamera) {
    super()
    const shared = { tDepth: { value: null as Texture | null }, uProjInv: { value: new Matrix4() }, uCamWorld: { value: new Matrix4() } }
    this.raysMaterial = new ShaderMaterial({ uniforms: { ...shared, tDiffuse: { value: null }, uSun: { value: new Vector2() } }, vertexShader, fragmentShader: raysShader, depthTest: false, depthWrite: false })
    this.compositeMaterial = new ShaderMaterial({
      uniforms: { ...shared, tDiffuse: { value: null }, tRays: { value: this.raysTarget.texture }, uCamPos: { value: new Vector3() }, uSunDir: { value: new Vector3() },
        uSunColor: { value: new Color() }, uMistColor: { value: new Color() }, uMist: { value: 0 }, uFalloff: { value: 0.2 }, uBase: { value: 0 }, uRays: { value: 0 }, uRaysOn: { value: 0 },
        uRevive: { value: [] as Vector4[] }, uCloud: { value: 0 }, uTime: { value: 0 }, uReviveCount: { value: 0 }, uReviveAll: { value: 0 }, uFaded: { value: 0 }, uWave: { value: new Color(1.0, 0.62, 0.25) } },
      vertexShader, fragmentShader: compositeShader, depthTest: false, depthWrite: false,
    })
    this.raysQuad = new FullScreenQuad(this.raysMaterial)
    this.compositeQuad = new FullScreenQuad(this.compositeMaterial)
    this.compositeMaterial.uniforms.uRevive.value = this.reviveVectors
  }
  setSize(width: number, height: number) { this.raysTarget.setSize(Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2))) }
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
    const s = this.settings, cam = this.camera, c = this.compositeMaterial.uniforms, r = this.raysMaterial.uniforms
    c.tDepth.value = r.tDepth.value = readBuffer.depthTexture
    c.uProjInv.value.copy(cam.projectionMatrixInverse); c.uCamWorld.value.copy(cam.matrixWorld)
    r.uProjInv.value.copy(cam.projectionMatrixInverse); r.uCamWorld.value.copy(cam.matrixWorld)
    c.tDiffuse.value = r.tDiffuse.value = readBuffer.texture
    c.uCamPos.value.setFromMatrixPosition(cam.matrixWorld)
    c.uSunDir.value.copy(s.sunDir); c.uSunColor.value.copy(s.sunColor); c.uMistColor.value.copy(s.mistColor)
    const count = Math.min(MAX_CIRCLES, s.reviveCount)
    for (let i = 0; i < count; i++) this.reviveVectors[i].fromArray(s.revive, i * 4)
    c.uReviveCount.value = count; c.uReviveAll.value = s.reviveAll; c.uFaded.value = s.faded
    c.uCloud.value = s.cloud; c.uTime.value = s.time
    c.uMist.value = s.mist; c.uFalloff.value = s.falloff; c.uBase.value = c.uCamPos.value.y - 3
    // Shafts only while the sun is in front of the camera; they fade as it leaves the frame.
    this.sunScreen.copy(c.uCamPos.value).addScaledVector(s.sunDir, 1000).project(cam)
    const facing = this.sunScreen.z < 1 ? 1 - Math.min(1, Math.max(0, Math.hypot(this.sunScreen.x, this.sunScreen.y) - 1) / 1.2) : 0
    const raysOn = s.raysOn && s.rays > 0.001 && facing > 0
    c.uRaysOn.value = raysOn ? 1 : 0; c.uRays.value = s.rays * facing
    if (raysOn) {
      r.uSun.value.set(this.sunScreen.x * 0.5 + 0.5, this.sunScreen.y * 0.5 + 0.5)
      renderer.setRenderTarget(this.raysTarget); this.raysQuad.render(renderer)
    }
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    this.compositeQuad.render(renderer)
  }
  dispose() { this.raysTarget.dispose(); this.raysMaterial.dispose(); this.compositeMaterial.dispose(); this.raysQuad.dispose(); this.compositeQuad.dispose() }
}
