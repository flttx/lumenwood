import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Mesh, PlaneGeometry, Points, ShaderMaterial, type Vector3 } from 'three'
import { useGameStore } from '../../../state/gameStore'
import { soundscape } from '../../audio/engine'
import { heightAt } from '../../world/terrain/terrain'
import { LAKE, WETLAND, rectDistance } from '../../world/regions'
import { flowers as flowerSpots } from '../../world/zones/floraLayout'
import { HOLLOW_HEART, REEF_HEART, SHRINE, VALE_HEART, VISTA_POINT, seeds } from '../../world/zones/sideLayout'
import { PLUNGE_POOL, wading } from '../../world/zones/wetlandLayout'
import { reflectionSkips } from '../../rendering/planarReflection'
import { createMoteMaterial } from '../route/moteMaterial'
import { LANTERN_COST, lanternPlacements } from '../route/routeLayout'
import { markActivity, route, routeClock, type SecretId } from '../route/progress'
import { conduit } from '../route/conduit'
import { seedAvailable } from '../secrets/secrets'
import { cameraPulse } from '../../camera/FollowCamera'
import { advanceResonance, boostFlow, pulseRadiusAt, resonance, triggerPulse, wakeReach } from './resonance'

const MAX_PINGS = 12, PING_LIFE = 2.4, FLOW_MOTES = 44
const QUIET_ECHO_PROMPT = '近处已归于宁静 · 暂未听到新的回声'
const SECRET_HEARTS: readonly { id: SecretId; x: number; z: number }[] = [
  { id: 'glen', x: PLUNGE_POOL.x, z: PLUNGE_POOL.z },
  { id: 'hollow', x: HOLLOW_HEART[0], z: HOLLOW_HEART[1] },
  { id: 'lake', x: SHRINE[0], z: SHRINE[1] },
  { id: 'overlook', x: VISTA_POINT[0], z: VISTA_POINT[1] },
  { id: 'vale', x: VALE_HEART[0], z: VALE_HEART[1] },
  { id: 'reef', x: REEF_HEART[0], z: REEF_HEART[1] },
]

const ringVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const ringFragment = `uniform vec3 uColor; uniform float uProgress; uniform float uOpacity; varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float edge = smoothstep(0.74, 0.94, d) * smoothstep(1.0, 0.95, d);
  float inner = smoothstep(0.45, 0.94, d) * smoothstep(1.0, 0.93, d) * 0.25;
  float wave = (edge + inner) * uOpacity * (1.0 - smoothstep(0.7, 1.0, uProgress));
  gl_FragColor = vec4(uColor * wave, wave);
}`

const beaconVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const beaconFragment = `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
void main() {
  float core = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float v = smoothstep(0.0, 0.14, vUv.y) * pow(max(1.0 - vUv.y, 0.0), 1.6);
  float a = pow(max(core, 0.0), 2.0) * v * uOpacity;
  gl_FragColor = vec4(uColor * a * 1.4, a);
}`

interface EchoPing {
  active: boolean
  x: number
  y: number
  z: number
  triggerAt: number
  fired: boolean
  pitch: number
  color: number
  flowerIndex: number
}

const COLOR_LAND = new Color(0xffe19c), COLOR_WATER = new Color(0x9ceeff)

/**
 * Drives the hand-lantern resonance pulse (`F` or right-click) and luminous flow particles.
 * Sweeping waves wake nearby flowers remotely, ping distant flowers/lanterns/seeds/secrets with
 * delayed spatial audio + light columns, and surge Highland conduit charging when aligned.
 */
export function ResonanceDirector({ player }: { player: Vector3 }) {
  const gl = useThree(s => s.gl), dpr = useThree(s => s.viewport.dpr)
  const ringRef = useRef<Mesh>(null)
  const fx = useMemo(() => {
    const ringGeo = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2)
    const ringMat = new ShaderMaterial({
      uniforms: { uColor: { value: new Color(0xffe19c) }, uProgress: { value: 1 }, uOpacity: { value: 0 } },
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
      toneMapped: false,
    })
    const beaconGeo = new CylinderGeometry(0.18, 0.42, 6.2, 10, 1, true).translate(0, 3.1, 0)
    const beacons = Array.from({ length: MAX_PINGS }, () => {
      const mat = new ShaderMaterial({
        uniforms: { uColor: { value: new Color(0xffe4a0) }, uOpacity: { value: 0 } },
        vertexShader: beaconVertex,
        fragmentShader: beaconFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        fog: false,
        toneMapped: false,
      })
      const mesh = new Mesh(beaconGeo, mat)
      mesh.visible = false
      return { mesh, mat }
    })
    const flowGeo = new BufferGeometry()
    const positions = new Float32Array(FLOW_MOTES * 3), alphas = new Float32Array(FLOW_MOTES)
    flowGeo.setAttribute('position', new BufferAttribute(positions, 3))
    flowGeo.setAttribute('aAlpha', new BufferAttribute(alphas, 1))
    const flowMat = createMoteMaterial(0xffe7aa)
    const flowPoints = new Points(flowGeo, flowMat)
    flowPoints.frustumCulled = false
    flowPoints.visible = false
    const pings: EchoPing[] = Array.from({ length: MAX_PINGS }, () => ({
      active: false, x: 0, y: 0, z: 0, triggerAt: 0, fired: false, pitch: 1, color: 0xffe4a0, flowerIndex: -1,
    }))
    const trail = Array.from({ length: FLOW_MOTES }, () => ({ x: 0, y: 0, z: 0, life: 0, vx: 0, vy: 0, vz: 0 }))
    return { ringGeo, ringMat, beaconGeo, beacons, flowGeo, flowMat, flowPoints, pings, trail, nextMote: 0, emitClock: 0, requested: false, lastHud: '', quietTimer: 0 }
  }, [])

  useEffect(() => {
    const ring = ringRef.current
    if (ring) reflectionSkips.add(ring)
    fx.beacons.forEach(b => reflectionSkips.add(b.mesh))
    reflectionSkips.add(fx.flowPoints)
    return () => {
      if (ring) reflectionSkips.delete(ring)
      fx.beacons.forEach(b => { reflectionSkips.delete(b.mesh); b.mat.dispose() })
      reflectionSkips.delete(fx.flowPoints)
      fx.ringGeo.dispose(); fx.ringMat.dispose(); fx.beaconGeo.dispose()
      fx.flowGeo.dispose(); fx.flowMat.dispose()
    }
  }, [fx])

  useEffect(() => {
    const element = gl.domElement
    const canPulse = () => {
      const s = useGameStore.getState()
      return s.phase === 'playing' && !s.journalOpen && !s.endingCard && !s.contextLost
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !canPulse()) return
      fx.requested = true
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2 || !canPulse()) return
      fx.requested = true
    }
    const onContextMenu = (e: MouseEvent) => {
      if (canPulse()) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    element.addEventListener('mousedown', onMouseDown)
    element.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('keydown', onKey)
      element.removeEventListener('mousedown', onMouseDown)
      element.removeEventListener('contextmenu', onContextMenu)
    }
  }, [gl, fx])

  useFrame((_, delta) => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing' || store.journalOpen) { fx.requested = false; return }
    const dt = Math.min(delta, 0.1), now = routeClock.now
    if (fx.quietTimer > 0) {
      fx.quietTimer -= dt
      if (fx.quietTimer <= 0 && store.prompt === QUIET_ECHO_PROMPT) store.setPrompt(null)
    }
    advanceResonance(resonance, dt, now)
    const flowStep = Math.round(resonance.flow * 20) / 20
    const hudKey = `${resonance.combo}:${route.secretsAt.size}:${flowStep}`
    if (hudKey !== fx.lastHud) {
      fx.lastHud = hudKey
      store.setResonanceHud({ combo: resonance.combo, secrets: route.secretsAt.size, flow: flowStep })
    }

    if (fx.requested) {
      fx.requested = false
      const onWater = wading(player.x, player.y, player.z) || rectDistance(player.x, player.z, WETLAND) === 0 || rectDistance(player.x, player.z, LAKE) === 0
      const seedCount = route.seedsAt.size
      if (triggerPulse(resonance, player.x, player.y, player.z, now, seedCount, onWater)) {
        markActivity()
        cameraPulse(0.16)
        soundscape.cue('pulse', player.x, player.y + 1.1, player.z, onWater ? 1.12 : 1)
        // Highland conduit synergy: pulsing while aligned at the active cradle surges light straight into the Ancient Tree.
        if (conduit.near >= 0 && conduit.near === conduit.expected && conduit.aligned && route.carried >= LANTERN_COST) {
          conduit.charge = Math.min(1, conduit.charge + 0.28)
          const [lx, ly, lz] = lanternPlacements[conduit.near].light
          soundscape.cue('lock', lx, ly, lz, 1.05 + conduit.charge * 0.25)
          boostFlow(resonance, now, seedCount, 1)
        }
        // Gather nearest meaningful echo targets within the expanding wave radius.
        const maxR = resonance.pulseMaxRadius, remoteR = wakeReach(seedCount, onWater)
        const candidates: { dist: number; x: number; y: number; z: number; pitch: number; color: number; flowerIndex: number }[] = []
        flowerSpots.forEach((f, i) => {
          if (f.zone === 'glade' || route.released.has(i)) return
          const d = Math.hypot(f.x - player.x, f.z - player.z)
          if (d <= maxR) candidates.push({ dist: d, x: f.x, y: heightAt(f.x, f.z), z: f.z, pitch: 1.0, color: 0xb8f6d2, flowerIndex: d <= remoteR ? i : -1 })
        })
        lanternPlacements.forEach((l, i) => {
          if (route.litAt[i] !== null) return
          const d = Math.hypot(l.x - player.x, l.z - player.z)
          if (d <= maxR) candidates.push({ dist: d, x: l.x, y: l.ground, z: l.z, pitch: 0.88, color: 0xffcf7a, flowerIndex: -1 })
        })
        seeds.forEach((s, i) => {
          if (!seedAvailable(route, i)) return
          const d = Math.hypot(s.x - player.x, s.z - player.z)
          if (d <= maxR) candidates.push({ dist: d, x: s.x, y: heightAt(s.x, s.z), z: s.z, pitch: 1.35, color: 0xaef4ff, flowerIndex: -1 })
        })
        for (const h of SECRET_HEARTS) {
          if (route.secretsAt.has(h.id)) continue
          const d = Math.hypot(h.x - player.x, h.z - player.z)
          if (d <= maxR + 8) candidates.push({ dist: Math.min(d, maxR), x: h.x, y: heightAt(h.x, h.z), z: h.z, pitch: 1.2, color: 0xffe8b0, flowerIndex: -1 })
        }
        candidates.sort((a, b) => a.dist - b.dist)
        if (candidates.length === 0 && (!store.prompt || store.prompt === QUIET_ECHO_PROMPT)) {
          store.setPrompt(QUIET_ECHO_PROMPT)
          fx.quietTimer = 2.0
        } else if (candidates.length > 0 && store.prompt === QUIET_ECHO_PROMPT) {
          store.setPrompt(null)
          fx.quietTimer = 0
        }
        for (let i = 0; i < MAX_PINGS; i++) {
          const c = candidates[i], p = fx.pings[i]
          if (!c) { p.active = false; continue }
          p.active = true; p.x = c.x; p.y = c.y; p.z = c.z
          p.triggerAt = now + c.dist / 28
          p.fired = false; p.pitch = c.pitch; p.color = c.color; p.flowerIndex = c.flowerIndex
        }
      }
    }

    // Update expanding pulse ring mesh.
    const radius = pulseRadiusAt(resonance, now)
    if (ringRef.current) {
      ringRef.current.visible = radius > 0
      if (radius > 0) {
        const progress = radius / Math.max(1, resonance.pulseMaxRadius)
        ringRef.current.position.set(resonance.pulseOrigin[0], resonance.pulseOrigin[1] + 0.14, resonance.pulseOrigin[2])
        ringRef.current.scale.setScalar(Math.max(0.5, radius))
        fx.ringMat.uniforms.uColor.value.copy(resonance.pulseOnWater ? COLOR_WATER : COLOR_LAND)
        fx.ringMat.uniforms.uProgress.value = progress
        fx.ringMat.uniforms.uOpacity.value = 0.72 * (1 - progress * 0.4)
      }
    }

    // Fire echo pings & remote flower wakes as the expanding wave reaches each target.
    let heardEchoes = 0
    for (let i = 0; i < MAX_PINGS; i++) {
      const p = fx.pings[i], b = fx.beacons[i]
      if (!p.active) { b.mesh.visible = false; continue }
      const age = now - p.triggerAt
      if (age < 0) { b.mesh.visible = false; continue }
      if (!p.fired) {
        p.fired = true
        if (p.flowerIndex >= 0) {
          resonance.remoteWake.add(p.flowerIndex)
        } else if (heardEchoes < 4) {
          // Cap simultaneous audio echoes per pulse so the forest answers with a clear chord rather than mud.
          heardEchoes++
          soundscape.cue('echo', p.x, p.y + 1.5, p.z, p.pitch)
        }
      }
      if (age > PING_LIFE) { p.active = false; b.mesh.visible = false; continue }
      const fade = Math.sin(Math.min(1, age / PING_LIFE) * Math.PI)
      b.mesh.visible = true
      b.mesh.position.set(p.x, p.y, p.z)
      b.mesh.scale.set(0.8 + 0.35 * fade, 0.7 + 0.55 * fade, 0.8 + 0.35 * fade)
      b.mat.uniforms.uColor.value.setHex(p.color)
      b.mat.uniforms.uOpacity.value = fade * 0.55
    }

    // Luminous flow dust ribbon trailing gently around the player while flow is active.
    const pos = fx.flowGeo.attributes.position as BufferAttribute, alp = fx.flowGeo.attributes.aAlpha as BufferAttribute
    let anyAlive = false
    if (resonance.flow > 0.08) {
      fx.emitClock += dt
      while (fx.emitClock >= 0.032) {
        fx.emitClock -= 0.032
        const m = fx.trail[fx.nextMote]
        fx.nextMote = (fx.nextMote + 1) % FLOW_MOTES
        const a = Math.random() * Math.PI * 2, r = 0.25 + Math.random() * 0.45
        m.x = player.x + Math.cos(a) * r; m.y = player.y + 0.35 + Math.random() * 0.95; m.z = player.z + Math.sin(a) * r
        m.vx = (Math.random() - 0.5) * 0.35; m.vy = 0.35 + Math.random() * 0.45; m.vz = (Math.random() - 0.5) * 0.35
        m.life = 0.85 + Math.random() * 0.35
      }
    }
    for (let i = 0; i < FLOW_MOTES; i++) {
      const m = fx.trail[i]
      if (m.life > 0) {
        anyAlive = true
        m.life -= dt
        m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt
        pos.setXYZ(i, m.x, m.y, m.z)
        alp.setX(i, Math.max(0, Math.min(1, m.life * 1.1)) * (0.45 + 0.45 * resonance.flow))
      } else {
        alp.setX(i, 0)
      }
    }
    fx.flowPoints.visible = anyAlive
    if (anyAlive) {
      fx.flowMat.uniforms.uTime.value = now
      fx.flowMat.uniforms.uSize.value = (68 + 12 * resonance.combo) * dpr
      fx.flowMat.uniforms.uOpacity.value = 0.78
      pos.needsUpdate = alp.needsUpdate = true
    }
  })

  return <>
    <mesh ref={ringRef} geometry={fx.ringGeo} material={fx.ringMat} visible={false} renderOrder={3} frustumCulled={false}/>
    {fx.beacons.map((b, i) => <primitive key={i} object={b.mesh}/>)}
    <primitive object={fx.flowPoints}/>
  </>
}
