// Shared between the water surface and the sand shader so the wash and damp edge keep the same rhythm.
export const surfTime = { value: 0 }
export const surfGLSL = `
float coveSurge(vec2 p, float t) {
  float across = 1.0 - smoothstep(30.0, 50.0, abs(p.x));
  float along = smoothstep(-122.0, -108.0, p.y) * (1.0 - smoothstep(-72.0, -62.0, p.y));
  float pulse = 0.5 + 0.5 * sin(t * 0.8 - p.y * 0.18 + p.x * 0.045 + sin(p.x * 0.13 - p.y * 0.09) * 0.32);
  return 0.22 * pulse * across * along;
}
`
