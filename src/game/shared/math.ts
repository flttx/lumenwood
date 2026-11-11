/** Hermite ease between edges e0 and e1, clamped to [0, 1]. */
export function smoothstep(e0: number, e1: number, x: number) { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
