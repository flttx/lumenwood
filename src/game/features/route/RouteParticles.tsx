import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, type Object3D, type Points } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { random } from '../../shared/random'
import { GLADE_CENTRE } from '../../world/zones/wetlandLayout'
import { flock, MAX_MOTES, type Mote } from './flock'
import { createMoteMaterial } from './moteMaterial'
import { GATE_DELAY, route, routeClock } from './progress'
import { ZONES, lanternPlacements, routeEnds, zoneLanterns, type Zone } from './routeLayout'
import { ANCIENT_TREE, PLATEAU_HEIGHT } from '../../world/zones/highlandLayout'
// Code particles for the route: the guide fireflies following the player, each completed zone's stream flowing from
// lantern to lantern toward its gate (the wetland stream carries on over the bridge into the glade), and the finale's
// rising column in the glade. All stay visible by day (dimmer) because they carry gameplay meaning.
const STREAM_COUNT = 56, STREAM_SPEED = 0.05, COLUMN_COUNT = 140, COLUMN_RISE = 6
// Ending: fireflies gather from the whole forest into the ancient tree's crown, then keep circling it.
const SWARM_COUNT = 260, SWARM_GATHER = 8, CROWN_Y = PLATEAU_HEIGHT + 17
// Guide fireflies leave a short fading trail (concept board: a chain of light), sampled every TRAIL_STEP seconds.
const TRAIL = 7, TRAIL_STEP = 0.035

function pointsGeometry(count: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(count), 1))
  return geometry
}
/** Polyline through a zone's lantern lights to its gate, with cumulative lengths for sampling by fraction. */
function routePath(zone: Zone) {
  // The highland stream climbs into the ancient tree's trunk; the others run at lantern height to their gates.
  const endY = zone === 'highland' ? PLATEAU_HEIGHT + 6 : 1.5
  const points: [number, number, number][] = [...zoneLanterns(zone).map(i => lanternPlacements[i].light), [routeEnds[zone][0], endY, routeEnds[zone][1]]]
  if (zone === 'wetland') points.push([GLADE_CENTRE[0], 1.8, GLADE_CENTRE[1]])
  const lengths = [0]
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][2] - points[i - 1][2]))
  return { points, lengths, total: lengths[lengths.length - 1] }
}
function sample({ points, lengths, total }: ReturnType<typeof routePath>, u: number, out: number[]) {
  const s = u * total
  let i = 1
  while (i < lengths.length - 1 && lengths[i] < s) i++
  const t = (s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1), a = points[i - 1], b = points[i]
  out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t
}

export function RouteParticles() {
  const dpr = useThree(s => s.viewport.dpr)
  const streamPoints = useRef<(Object3D | null)[]>([])
  const columnPoints = useRef<Points>(null), swarmPoints = useRef<Points>(null)
  const parts = useMemo(() => {
    const rand = random(31)
    return {
      guide: { geometry: pointsGeometry(MAX_MOTES), material: createMoteMaterial(0xffe6a8) },
      trail: { geometry: pointsGeometry(MAX_MOTES * TRAIL), material: createMoteMaterial(0xffc86e), history: new WeakMap<Mote, number[]>(), clock: 0 },
      streams: ZONES.map(zone => ({ zone, geometry: pointsGeometry(STREAM_COUNT), material: createMoteMaterial(0xffd27d), path: routePath(zone) })),
      seeds: Array.from({ length: STREAM_COUNT }, () => [rand(), rand() * 6.28, 0.2 + rand() * 0.35]),
      column: { geometry: pointsGeometry(COLUMN_COUNT), material: createMoteMaterial(0xfff0c4), seeds: Array.from({ length: COLUMN_COUNT }, () => [rand(), rand() * 6.28, rand()]) },
      swarm: { geometry: pointsGeometry(SWARM_COUNT), material: createMoteMaterial(0xffe2a0), seeds: Array.from({ length: SWARM_COUNT }, () => [rand() * Math.PI * 2, 40 + rand() * 50, rand() * 25, rand(), rand()]) },
      scratch: [0, 0, 0],
    }
  }, [])
  useFrame((_, delta) => {
    const now = routeClock.now, opacity = 0.55 + 0.45 * atmosphere.preset.fireflies
    const { guide, trail, streams, seeds, column, swarm, scratch } = parts
    for (const { material } of [guide, trail, column, swarm, ...streams]) { material.uniforms.uTime.value = now; material.uniforms.uOpacity.value = opacity }
    guide.material.uniforms.uSize.value = 170 * dpr; trail.material.uniforms.uSize.value = 95 * dpr; column.material.uniforms.uSize.value = 90 * dpr
    const gp = guide.geometry.attributes.position as BufferAttribute, ga = guide.geometry.attributes.aAlpha as BufferAttribute
    const tp = trail.geometry.attributes.position as BufferAttribute, ta = trail.geometry.attributes.aAlpha as BufferAttribute
    trail.clock += delta
    const step = trail.clock >= TRAIL_STEP
    if (step) trail.clock = 0
    flock.motes.forEach((m, i) => {
      gp.setXYZ(i, m.x, m.y, m.z); ga.setX(i, 1)
      // Each mote keeps its last TRAIL positions (newest first) as a flat xyz list.
      let h = trail.history.get(m)
      if (!h) trail.history.set(m, h = Array.from({ length: TRAIL * 3 }, (_, k) => [m.x, m.y, m.z][k % 3]))
      if (step) { h.copyWithin(3, 0, (TRAIL - 1) * 3); h[0] = m.x; h[1] = m.y; h[2] = m.z }
      for (let k = 0; k < TRAIL; k++) { tp.setXYZ(i * TRAIL + k, h[k * 3], h[k * 3 + 1], h[k * 3 + 2]); ta.setX(i * TRAIL + k, 0.55 * (1 - k / TRAIL)) }
    })
    guide.geometry.setDrawRange(0, flock.motes.length); trail.geometry.setDrawRange(0, flock.motes.length * TRAIL)
    gp.needsUpdate = ga.needsUpdate = tp.needsUpdate = ta.needsUpdate = true
    // Each stream grows from the zone's first lantern to its gate over GATE_DELAY, then keeps flowing as a lasting guide line.
    streams.forEach((stream, k) => {
      const done = route.completedAt[stream.zone], points = streamPoints.current[k]
      if (points) points.visible = done !== null
      if (done === null) return
      stream.material.uniforms.uSize.value = 110 * dpr
      const elapsed = now - done, head = Math.min(1, elapsed / GATE_DELAY)
      const sp = stream.geometry.attributes.position as BufferAttribute, sa = stream.geometry.attributes.aAlpha as BufferAttribute
      seeds.forEach(([offset, phase, wobble], i) => {
        const u = (offset + elapsed * STREAM_SPEED) % 1
        sample(stream.path, u, scratch)
        sp.setXYZ(i, scratch[0] + Math.sin(now * 1.3 + phase) * wobble, scratch[1] + Math.sin(now * 1.9 + phase * 2) * wobble * 0.7, scratch[2] + Math.cos(now * 1.1 + phase) * wobble)
        sa.setX(i, u <= head ? 1 : 0)
      })
      sp.needsUpdate = sa.needsUpdate = true
    })
    // Ending: each mote starts far out in a random direction, sweeps in over SWARM_GATHER seconds, then orbits the crown.
    const ending = route.completedAt.highland
    if (swarmPoints.current) swarmPoints.current.visible = ending !== null
    if (ending !== null) {
      swarm.material.uniforms.uSize.value = 110 * dpr
      const sp = swarm.geometry.attributes.position as BufferAttribute, sa = swarm.geometry.attributes.aAlpha as BufferAttribute
      swarm.seeds.forEach(([angle, far, height, delay, spread], i) => {
        const t = Math.max(0, Math.min(1, (now - ending - delay * 2) / SWARM_GATHER)), ease = 1 - (1 - t) ** 3
        const orbit = angle + now * (0.25 + spread * 0.3), r = far + (4 + spread * 9 - far) * ease
        const y = (PLATEAU_HEIGHT + height) + (CROWN_Y - 4 + spread * 8 - PLATEAU_HEIGHT - height) * ease
        sp.setXYZ(i, ANCIENT_TREE[0] + Math.cos(orbit) * r, y, ANCIENT_TREE[1] + Math.sin(orbit) * r)
        sa.setX(i, Math.min(1, (now - ending - delay * 2) * 0.8))
      })
      sp.needsUpdate = sa.needsUpdate = true
    }
    // Finale: fireflies spiral up out of the glade over COLUMN_RISE seconds, then keep circling as a lasting beacon.
    const finale = route.finaleAt
    if (columnPoints.current) columnPoints.current.visible = finale !== null
    if (finale === null) return
    const rise = Math.min(1, (now - finale) / COLUMN_RISE), cp = column.geometry.attributes.position as BufferAttribute, ca = column.geometry.attributes.aAlpha as BufferAttribute
    column.seeds.forEach(([h, phase, spread], i) => {
      const height = 0.4 + h * 9 * rise, angle = phase + now * (0.6 + spread * 0.5) + height * 0.35, radius = 0.6 + height * 0.18 + spread * 0.8
      cp.setXYZ(i, GLADE_CENTRE[0] + Math.cos(angle) * radius, height, GLADE_CENTRE[1] + Math.sin(angle) * radius)
      ca.setX(i, Math.min(1, rise * 3) * (1 - 0.6 * h))
    })
    cp.needsUpdate = ca.needsUpdate = true
  })
  return <>
    <points geometry={parts.trail.geometry} material={parts.trail.material} frustumCulled={false}/>
    <points geometry={parts.guide.geometry} material={parts.guide.material} frustumCulled={false}/>
    {parts.streams.map((s, k) => <points key={s.zone} ref={(node: Object3D | null) => { streamPoints.current[k] = node }} geometry={s.geometry} material={s.material} frustumCulled={false} visible={false}/>)}
    <points ref={columnPoints} geometry={parts.column.geometry} material={parts.column.material} frustumCulled={false} visible={false}/>
    <points ref={swarmPoints} geometry={parts.swarm.geometry} material={parts.swarm.material} frustumCulled={false} visible={false}/>
  </>
}
