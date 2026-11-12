import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Euler, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type WebGLProgramParametersWithUniforms } from 'three'
import { assetConfig } from '../../assets/config'
import { atmosphere } from '../../rendering/timeOfDay'
import { trailTarget } from '../../rendering/Grass'
import { random } from '../../shared/random'
import { heightAt } from '../../world/terrain/terrain'
import { CAMP, HIGHLAND } from '../../world/regions'
import { basinDepth } from '../../world/zones/wetlandLayout'
import { standDensity, treeColliders } from '../../world/zones/forestLayout'
import { logColliders, shrubColliders, stoneColliders, stumpColliders } from '../../world/zones/sceneryLayout'
import { cabinCollider, campBoxColliders, campCircleColliders } from '../../world/zones/campLayout'
import { createRabbit, rabbitPose, stepRabbit, type Rabbit } from './rabbits'
import { FLOCKS, FLOCK_SIZE, birdPosition, crossingFor, type Crossing } from './birds'
// Wildlife (scene enrichment, 2026-11-12): CRT-001 rabbits in the glades and CRT-002 bird flocks crossing the sky.
// Both models are static Meshy meshes; rabbits hop by code (rabbits.ts), birds beat their wings in the vertex shader.
const RABBIT_URL = `${assetConfig.baseUrl}models/creatures/CRT-001.glb`, BIRD_URL = `${assetConfig.baseUrl}models/creatures/CRT-002.glb`
useGLTF.preload(RABBIT_URL, false, false); useGLTF.preload(BIRD_URL, false, false)
const RABBITS = 16, RABBIT_ACTIVE = 70

/** Where the rabbits live: open glades in the camp and on the plateau, well apart. */
export function rabbitHomes() {
  const rand = random(441), out: { x: number; z: number }[] = []
  for (let tries = 0; out.length < RABBITS && tries < 5000; tries++) {
    const area = rand() < 0.75 ? CAMP : HIGHLAND
    const x = area.minX + 8 + rand() * (area.maxX - area.minX - 16), z = area.minZ + 8 + rand() * (area.maxZ - area.minZ - 16)
    if (standDensity(x, z) > 0.3 || !open(x, z) || Math.hypot(x, z) < 12 || out.some(h => Math.hypot(h.x - x, h.z - z) < 14)) continue
    out.push({ x, z })
  }
  return out
}
const solid = [...treeColliders, ...stoneColliders, ...shrubColliders, ...stumpColliders, ...campCircleColliders]
const boxes = [cabinCollider, ...campBoxColliders, ...logColliders]
/** Free ground for a rabbit: dry, clear of trunks, stones, shrubs and structures. */
export function open(x: number, z: number) {
  if (basinDepth(x, z) < 0) return false
  if (solid.some(c => Math.hypot(c.x - x, c.z - z) < c.radius + 0.25)) return false
  return boxes.every(b => {
    const cos = Math.cos(b.angle), sin = Math.sin(b.angle), dx = x - b.x, dz = z - b.z
    return Math.abs(dx * cos - dz * sin) > b.halfX + 0.25 || Math.abs(dx * sin + dz * cos) > b.halfZ + 0.25
  })
}

function sourceMesh(scene: { getObjectByName: (name: string) => unknown }, id: string, url: string) {
  const mesh = scene.getObjectByName(id)
  if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshStandardMaterial)) throw new Error(`${url} has no standard mesh named ${id}`)
  return mesh
}

function Rabbits() {
  const { scene } = useGLTF(RABBIT_URL, false, false)
  const herd = useMemo(() => {
    const source = sourceMesh(scene, 'CRT-001', RABBIT_URL), rand = random(443)
    const rabbits: Rabbit[] = rabbitHomes().map(h => createRabbit(h, rand))
    const mesh = new InstancedMesh(source.geometry, source.material, rabbits.length)
    mesh.castShadow = mesh.receiveShadow = true
    mesh.frustumCulled = false // instances roam the whole map; there are only a few
    return { rabbits, mesh, rand, m: new Matrix4(), q: new Quaternion(), e: new Euler(0, 0, 0, 'YXZ'), p: new Vector3(), s: new Vector3() }
  }, [scene])
  useFrame(({ clock }, delta) => {
    const { rabbits, mesh, rand, m, q, e, p, s } = herd, dt = Math.min(delta, 0.1), player = trailTarget.position, t = clock.elapsedTime
    rabbits.forEach((r, i) => {
      // Only rabbits near the player need to think.
      if (Math.hypot(r.x - player.x, r.z - player.z) < RABBIT_ACTIVE) stepRabbit(r, dt, player, open, rand)
      const pose = rabbitPose(r, t + i)
      e.set(pose.pitch, r.heading, 0)
      mesh.setMatrixAt(i, m.compose(p.set(r.x, heightAt(r.x, r.z) + pose.lift, r.z), q.setFromEuler(e), s.set(1 / Math.sqrt(pose.stretch), 1 / Math.sqrt(pose.stretch), pose.stretch)))
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={herd.mesh}/>
}

function Birds() {
  const { scene } = useGLTF(BIRD_URL, false, false)
  const flock = useMemo(() => {
    const source = sourceMesh(scene, 'CRT-002', BIRD_URL), material = source.material.clone(), time = { value: 0 }
    // Meshy built the bird upright, belly to the front (from the top-down reference): turn it to level flight, head
    // forward (+Z), belly down, and centre it on the body.
    const geometry = source.geometry.clone().rotateX(Math.PI / 2).center()
    // Wing beat: each half of the mesh rotates about the body axis (local z), more toward the wing tips; flocks glide
    // between bursts of flapping. The instance index offsets the rhythm so the birds do not beat in unison.
    material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uTime = time
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
  float phase = float(gl_InstanceID) * 1.73;
  float flapping = step(-0.2, sin(uTime * 0.8 + phase));
  float beat = mix(0.12, 0.75 * sin(uTime * 17.0 + phase), flapping);
  float wing = smoothstep(0.02, 0.16, abs(transformed.x)) * sign(transformed.x) * beat;
  transformed = vec3(transformed.x * cos(wing) - transformed.y * sin(wing), transformed.x * sin(wing) + transformed.y * cos(wing), transformed.z);`)
    }
    material.customProgramCacheKey = () => 'lumenwood-bird'
    const mesh = new InstancedMesh(geometry, material, FLOCKS * FLOCK_SIZE)
    mesh.frustumCulled = false
    const crossings: (Crossing | null)[] = Array.from({ length: FLOCKS }, () => null)
    return { mesh, material, time, crossings, m: new Matrix4(), q: new Quaternion(), e: new Euler(0, 0, 0, 'YXZ'), p: new Vector3(), zero: new Vector3(0, 0, 0), one: new Vector3(1, 1, 1) }
  }, [scene])
  useEffect(() => () => { flock.material.dispose(); flock.mesh.geometry.dispose() }, [flock])
  useFrame(({ clock }) => {
    const { mesh, time, crossings, m, q, e, p, zero, one } = flock, t = clock.elapsedTime, day = 1 - atmosphere.blend, player = trailTarget.position
    time.value = t
    mesh.visible = day > 0.5 // songbirds by day only
    for (let f = 0; f < FLOCKS; f++) {
      // A new crossing is aimed past wherever the player is when it begins.
      const current = crossings[f], next = crossingFor(f, t, player)
      const c = current && current.start === next.start ? current : (crossings[f] = next)
      for (let i = 0; i < FLOCK_SIZE; i++) {
        const b = birdPosition(c, i, t), index = f * FLOCK_SIZE + i
        if (!b) { mesh.setMatrixAt(index, m.compose(p.set(0, -100, 0), q.identity(), zero)); continue }
        e.set(0, b.heading, Math.sin(t * 0.7 + i) * 0.15)
        mesh.setMatrixAt(index, m.compose(p.set(b.x, b.y + heightAt(b.x, b.z), b.z), q.setFromEuler(e), one))
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={flock.mesh}/>
}

export function Wildlife() { return <><Rabbits/><Birds/></> }
