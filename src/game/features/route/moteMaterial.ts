import { AdditiveBlending, Color, ShaderMaterial } from 'three'
// Point sprites for guide fireflies and the route stream: a soft warm core that blinks gently. Positions come from the CPU
// each frame (a few dozen points at most); `aAlpha` fades individual points in and out.
const vertexShader = `uniform float uTime; uniform float uSize; attribute float aAlpha; varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float blink = 0.75 + 0.25 * sin(uTime * 5.0 + position.x * 3.1 + position.z * 2.3);
  vAlpha = aAlpha * blink * smoothstep(0.5, 1.8, -mv.z); // fade right at the lens
  gl_PointSize = min(uSize / -mv.z, 64.0);
  gl_Position = projectionMatrix * mv;
}`
const fragmentShader = `uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor * (core * core + 0.6 * pow(core, 8.0)) * vAlpha * uOpacity, 1.0);
  #include <colorspace_fragment>
}`
export function createMoteMaterial(color: number) {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: 0 }, uOpacity: { value: 1 }, uColor: { value: new Color(color) } },
    vertexShader, fragmentShader, blending: AdditiveBlending, transparent: true, depthWrite: false,
  })
}
