// Speed thresholds (m/s) between clips, with a small band so the clip does not flicker at a boundary.
const IDLE_BELOW = 0.3, RUN_ABOVE = 5.2, BAND = 0.3
export type Gait = 'idle' | 'walk' | 'run'
export function gaitFor(speed: number, current: string): Gait {
  const band = (gait: Gait) => (current === gait ? BAND : 0)
  if (speed < IDLE_BELOW + band('idle')) return 'idle'
  if (speed > RUN_ABOVE - band('run')) return 'run'
  return 'walk'
}
