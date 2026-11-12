import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, type Object3D, type Points } from 'three'
import { atmosphere } from '../../rendering/timeOfDay'
import { random } from '../../shared/random'
import { GLADE_CENTRE } from '../../world/zones/wetlandLayout'
import { flock, MAX_MOTES } from './flock'
import { createMoteMaterial } from './moteMaterial'
import { GATE_DELAY, route, routeClock } from './progress'
import { lanternPlacements, routeEnds, zoneLanterns, type Zone } from './routeLayout'
// Code particles for the route: the guide fireflies following the player, each completed zone's stream flowing from
// lantern to lantern toward its gate (the wetland stream carries on over the bridge into the glade), and the finale's
// rising column in the glade. All stay visible by day (dimmer) because they carry gameplay meaning.
const STREAM_COUNT = 56, STREAM_SPEED = 0.05, COLUMN_COUNT = 140, COLUMN_RISE = 6
const zones: Zone[] = ['camp', 'wetland']

function pointsGeometry(count: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(count), 1))
  return geometry
}
/** Polyline through a zone's lantern lights to its gate, with cumulative lengths for sampling by fraction. */
function routePath(zone: Zone) {
  const points: [number, number, number][] = [...zoneLanterns(zone).map(i => lanternPlacements[i].light), [routeEnds[zone][0], 1.5, routeEnds[zone][1]]]
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
  const columnPoints = useRef<Points>(null)
  const parts = useMemo(() => {
    const rand = random(31)
    return {
      guide: { geometry: pointsGeometry(MAX_MOTES), material: createMoteMaterial(0xffe6a8) },
      streams: zones.map(zone => ({ zone, geometry: pointsGeometry(STREAM_COUNT), material: createMoteMaterial(0xffd27d), path: routePath(zone) })),
      seeds: Array.from({ length: STREAM_COUNT }, () => [rand(), rand() * 6.28, 0.2 + rand() * 0.35]),
      column: { geometry: pointsGeometry(COLUMN_COUNT), material: createMoteMaterial(0xfff0c4), seeds: Array.from({ length: COLUMN_COUNT }, () => [rand(), rand() * 6.28, rand()]) },
      scratch: [0, 0, 0],
    }
  }, [])
  useFrame(() => {
    const now = routeClock.now, opacity = 0.55 + 0.45 * atmosphere.preset.fireflies
    const { guide, streams, seeds, column, scratch } = parts
    for (const { material } of [guide, column, ...streams]) { material.uniforms.uTime.value = now; material.uniforms.uOpacity.value = opacity }
    guide.material.uniforms.uSize.value = 120 * dpr; column.material.uniforms.uSize.value = 90 * dpr
    const gp = guide.geometry.attributes.position as BufferAttribute, ga = guide.geometry.attributes.aAlpha as BufferAttribute
    flock.motes.forEach((m, i) => { gp.setXYZ(i, m.x, m.y, m.z); ga.setX(i, 1) })
    guide.geometry.setDrawRange(0, flock.motes.length)
    gp.needsUpdate = ga.needsUpdate = true
    // Each stream grows from the zone's first lantern to its gate over GATE_DELAY, then keeps flowing as a lasting guide line.
    streams.forEach((stream, k) => {
      const done = route.completedAt[stream.zone], points = streamPoints.current[k]
      if (points) points.visible = done !== null
      if (done === null) return
      stream.material.uniforms.uSize.value = 80 * dpr
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
    <points geometry={parts.guide.geometry} material={parts.guide.material} frustumCulled={false}/>
    {parts.streams.map((s, k) => <points key={s.zone} ref={(node: Object3D | null) => { streamPoints.current[k] = node }} geometry={s.geometry} material={s.material} frustumCulled={false} visible={false}/>)}
    <points ref={columnPoints} geometry={parts.column.geometry} material={parts.column.material} frustumCulled={false} visible={false}/>
  </>
}
