import { Vector3, type Camera } from 'three'
import { ambienceMix, chimeFrequency, nextChirpDelay, nextCroakDelay, nextOwlDelay } from './soundscape'
import { BEAT, BEATS_PER_BAR, arpNote, bellNote, chordAt, midiFreq } from './music'
import { WATERFALL } from '../world/zones/sideLayout'
import { PLUNGE_POOL } from '../world/zones/wetlandLayout'
import { campfire } from '../world/zones/campLayout'
import { heightAt } from '../world/terrain/terrain'
// Web Audio soundscape synthesised at runtime, so there are no audio files to source or license. The context is created on
// the first user gesture (browser autoplay policy) and suspended whenever the game is not playing.
const SMOOTHING = 0.4
export type SoundState = 'off' | 'unavailable' | AudioContextState
export type FootstepSurface = 'grass' | 'dirt' | 'wood' | 'sand' | 'crystal'
export type CueKind = 'reject' | 'lock' | 'reset' | 'conduit' | 'preview' | 'pulse' | 'echo' | 'hearth'
export type WorldEventSound = 'vineGrow' | 'bridgeBuild' | 'mistClear' | 'seedAbsorb'

class Soundscape {
  private ctx: AudioContext | null = null
  private failed = false
  private active = false
  private suspendTimer: number | null = null
  private master!: GainNode
  private reverbSend!: GainNode
  private wind!: GainNode
  private windFilter!: BiquadFilterNode
  private pine!: GainNode
  private birds!: GainNode
  private crickets!: GainNode
  private water!: GainNode
  private frogs!: GainNode
  private noise!: AudioBuffer
  private birdTimer = 1
  private croakTimer = 1
  private fireTimer = 0.3
  private owlTimer = 10
  private music!: GainNode
  private musicLayers = 0
  private secretBonus = 0
  private nextBeat = 0
  private beatIndex = 0
  private volume = 0.7
  private readonly forward = new Vector3()
  private readonly up = new Vector3()
  private readonly firePos = new Vector3(campfire.x, heightAt(campfire.x, campfire.z) + 0.5, campfire.z)
  /** Flower chimes requested so far (counted even while silent; read by the debug hook). */
  chimes = 0
  /** Wading splashes requested so far (also read by the debug hook). */
  splashes = 0
  /** Music voices currently playing (0–7; read by the debug hook). */
  get layers() { return this.musicLayers }

  /** How many score voices play; they join or leave on the next beat. */
  setMusicLayers(layers: number) { this.musicLayers = layers }
  /** Solved side-area secrets (0–4) enrich the ending score with extra crystalline overtones. */
  setSecretBonus(count: number) { this.secretBonus = Math.max(0, Math.min(4, count)) }

  /** Clears session counters and silences lingering score voices before starting a new/restored journey. */
  resetSession() {
    this.musicLayers = 0; this.secretBonus = 0; this.nextBeat = 0; this.beatIndex = 0
    this.chimes = 0; this.splashes = 0; this.footsteps = 0; this.owlTimer = 10
    if (this.ctx && this.music) {
      const now = this.ctx.currentTime
      this.music.gain.cancelScheduledValues(now)
      this.music.gain.setValueAtTime(0, now)
      this.music.gain.setTargetAtTime(1, now + 0.08, 0.15)
    }
  }

  get state(): SoundState { return this.failed ? 'unavailable' : this.ctx?.state ?? 'off' }

  /** Call from a user gesture. Safe to call repeatedly; transient resume rejections never lock audio permanently. */
  start() {
    if (this.failed) return
    try {
      if (!this.ctx || this.ctx.state === 'closed') this.build(new AudioContext())
      if (this.suspendTimer !== null) { window.clearTimeout(this.suspendTimer); this.suspendTimer = null }
      this.active = true
      if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => { /* retry on next user gesture */ })
      if (this.ctx) this.master.gain.setTargetAtTime(this.volume * 0.8, this.ctx.currentTime, 0.04)
    } catch {
      this.failed = true // no Web Audio support: the game stays silent
    }
  }

  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.ctx && this.active) this.master.gain.setTargetAtTime(this.volume * 0.8, this.ctx.currentTime, 0.05)
  }

  setActive(active: boolean) {
    this.active = active
    const ctx = this.ctx
    if (!ctx || ctx.state === 'closed') return
    if (this.suspendTimer !== null) { window.clearTimeout(this.suspendTimer); this.suspendTimer = null }
    const now = ctx.currentTime
    if (active) {
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setValueAtTime(0.0001, now)
      this.master.gain.setTargetAtTime(this.volume * 0.8, now, 0.04)
      if (ctx.state !== 'running') ctx.resume().catch(() => { /* wait for next gesture */ })
    } else {
      // Fade master gain briefly before suspending to prevent DC pop clicks on pause.
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(0.0001, now, 0.015)
      this.suspendTimer = window.setTimeout(() => {
        this.suspendTimer = null
        if (!this.active && this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => { /* ignore */ })
      }, 45)
    }
  }

  /** Per frame: ambience follows the time of day, zone, and wind gusts, the listener follows the camera, wildlife/fire schedule. */
  update(dt: number, blend: number, camera: Camera, wetland = 0, highland = 0, gust = 0, night = 0) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const mix = ambienceMix(blend, wetland, highland, gust), now = ctx.currentTime
    this.water.gain.setTargetAtTime(mix.water, now, SMOOTHING)
    this.frogs.gain.setTargetAtTime(mix.frogs, now, SMOOTHING)
    this.wind.gain.setTargetAtTime(mix.wind, now, SMOOTHING)
    this.pine.gain.setTargetAtTime(mix.pine, now, SMOOTHING)
    this.windFilter.frequency.setTargetAtTime(320 + 480 * gust + 180 * highland, now, 0.35)
    this.reverbSend.gain.setTargetAtTime(0.24 + 0.14 * highland + 0.08 * wetland, now, 0.6)
    this.birds.gain.setTargetAtTime(mix.birds, now, SMOOTHING)
    this.crickets.gain.setTargetAtTime(mix.crickets * 0.5, now, SMOOTHING)
    const l = ctx.listener
    camera.getWorldDirection(this.forward)
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion)
    if (l.positionX) {
      l.positionX.setTargetAtTime(camera.position.x, now, 0.02)
      l.positionY.setTargetAtTime(camera.position.y, now, 0.02)
      l.positionZ.setTargetAtTime(camera.position.z, now, 0.02)
      l.forwardX.setTargetAtTime(this.forward.x, now, 0.02)
      l.forwardY.setTargetAtTime(this.forward.y, now, 0.02)
      l.forwardZ.setTargetAtTime(this.forward.z, now, 0.02)
      l.upX.setTargetAtTime(this.up.x, now, 0.02)
      l.upY.setTargetAtTime(this.up.y, now, 0.02)
      l.upZ.setTargetAtTime(this.up.z, now, 0.02)
    }
    if ((this.birdTimer -= dt) <= 0) {
      this.birdTimer = nextChirpDelay(Math.random())
      if (mix.birds > 0.05) this.birdPhrase(ctx)
    }
    this.scheduleMusic(ctx)
    if ((this.croakTimer -= dt) <= 0) {
      this.croakTimer = nextCroakDelay(Math.random())
      if (mix.frogs > 0.05) this.croak(ctx)
    }
    // Gentle campfire wood crackles when near the cabin hearth.
    if ((this.fireTimer -= dt) <= 0) {
      this.fireTimer = 0.25 + Math.random() * 0.7
      if (camera.position.distanceToSquared(this.firePos) < 28 * 28) this.crackle(ctx)
    }
    // Distant night owl hoots once twilight deepens into night.
    if (night > 0.45 && (this.owlTimer -= dt) <= 0) {
      this.owlTimer = nextOwlDelay(Math.random())
      this.owlCall(ctx)
    }
  }

  /** Footsteps requested so far (read by the debug hook). */
  footsteps = 0
  /** One footstep on `surface` at (x, y, z); larger refDistance avoids volume jumps when the camera pulls in. */
  footstep(surface: FootstepSurface, x: number, y: number, z: number, strength: number) {
    const ctx = this.ctx
    this.footsteps++
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime, out = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 7.5, positionX: x, positionY: y, positionZ: z })
    out.connect(this.master)
    let activeSources = 0
    const release = () => { if (--activeSources <= 0) out.disconnect() }
    const burst = (filter: BiquadFilterOptions, level: number, length: number, delay = 0, rate = 1) => {
      activeSources++
      const source = new AudioBufferSourceNode(ctx, { buffer: this.noise, playbackRate: rate * (0.85 + Math.random() * 0.3) }), gain = new GainNode(ctx, { gain: 0 }), t = now + delay
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
      source.connect(new BiquadFilterNode(ctx, filter)).connect(gain).connect(out)
      source.onended = release
      source.start(t, Math.random() * 2.5, length + 0.05)
    }
    const s = 0.6 + 0.4 * strength
    if (surface === 'grass') {
      burst({ type: 'highpass', frequency: 2400 + Math.random() * 800, Q: 0.6 }, 0.085 * s, 0.11)
      burst({ type: 'bandpass', frequency: 4000, Q: 0.8 }, 0.05 * s, 0.09, 0.04)
      if (strength > 0.75) burst({ type: 'highshelf', frequency: 4800, gain: 4 }, 0.026 * s, 0.13, 0.02, 1.2)
    } else if (surface === 'dirt') {
      burst({ type: 'lowpass', frequency: 520 + Math.random() * 160, Q: 0.9 }, 0.14 * s, 0.09, 0, 0.6)
      burst({ type: 'bandpass', frequency: 1800, Q: 1.2 }, 0.025 * s, 0.06, 0.01)
    } else if (surface === 'sand') {
      // Soft granular sand crunch along the crescent cove.
      burst({ type: 'bandpass', frequency: 1900 + Math.random() * 500, Q: 0.7 }, 0.08 * s, 0.14, 0, 0.85)
      burst({ type: 'lowpass', frequency: 420, Q: 0.7 }, 0.06 * s, 0.08, 0.01, 0.55)
    } else if (surface === 'crystal') {
      // Delicate shimmering resonance on the light bridge.
      activeSources++
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: 880 + Math.random() * 180 }), gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.032 * s, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
      osc.connect(gain).connect(out); osc.onended = release; osc.start(now); osc.stop(now + 0.26)
      burst({ type: 'highpass', frequency: 3200, Q: 0.8 }, 0.035 * s, 0.07)
    } else {
      // Wood: a hollow knock on the planks or vine bridge.
      activeSources++
      const osc = new OscillatorNode(ctx, { type: 'triangle', frequency: 150 + Math.random() * 40 }), gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.11 * s, now + 0.005); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
      osc.connect(gain).connect(out); osc.onended = release; osc.start(now); osc.stop(now + 0.16)
      burst({ type: 'bandpass', frequency: 900, Q: 1.5 }, 0.05 * s, 0.07)
    }
  }

  /** Short filtered splash from a wading step at (x, y, z); `strength` in [0, 1]. */
  splash(x: number, y: number, z: number, strength: number) {
    const ctx = this.ctx
    this.splashes++
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime, source = new AudioBufferSourceNode(ctx, { buffer: this.noise, playbackRate: 0.8 + Math.random() * 0.5 })
    const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 900 + Math.random() * 700, Q: 1.1 }), gain = new GainNode(ctx, { gain: 0 })
    const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 6.5, positionX: x, positionY: y, positionZ: z })
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.14 + 0.18 * strength, now + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
    source.connect(band).connect(gain).connect(panner).connect(this.master)
    source.onended = () => panner.disconnect()
    source.start(now, Math.random() * 2, 0.32)
  }

  /** Bell-like note placed in 3D so it comes from its source's direction; `delay` (s) staggers notes into chords. */
  chime(index: number, x: number, y: number, z: number, delay = 0, refDistance = 5) {
    const ctx = this.ctx
    this.chimes++
    if (!ctx || ctx.state !== 'running') return
    const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance, positionX: x, positionY: y, positionZ: z })
    panner.connect(this.master)
    panner.connect(this.reverbSend)
    const f = chimeFrequency(index), now = ctx.currentTime + delay
    let left = 3
    const release = () => { if (--left <= 0) panner.disconnect() }
    for (const [ratio, level, decay] of [[1, 0.32, 2.2], [2.005, 0.11, 1.2], [3.01, 0.045, 0.6]]) {
      const osc = new OscillatorNode(ctx, { frequency: f * ratio }), gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      osc.connect(gain).connect(panner); osc.onended = release; osc.start(now); osc.stop(now + decay + 0.05)
    }
  }

  /** Distinct tactile audio cues for puzzles, rejection/resets, conduit charging, and volume preview. */
  cue(kind: CueKind, x = 0, y = 0, z = 0, pitch = 1) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    if (kind === 'preview') {
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: 523.25 }), gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.14, now + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
      osc.connect(gain).connect(this.master); osc.start(now); osc.stop(now + 0.38)
      return
    }
    const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 6, positionX: x, positionY: y, positionZ: z })
    panner.connect(this.master)
    if (kind === 'lock' || kind === 'pulse' || kind === 'echo' || kind === 'hearth') panner.connect(this.reverbSend)
    if (kind === 'reject' || kind === 'reset') {
      // Soft descending wood/stone pair — clearly distinct from pentatonic success chimes.
      const notes = kind === 'reset' ? [260, 195] : [220, 175]
      let left = notes.length
      notes.forEach((freq, i) => {
        const t = now + i * 0.09, osc = new OscillatorNode(ctx, { type: 'triangle', frequency: freq }), gain = new GainNode(ctx, { gain: 0 })
        const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 650 })
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.16, t + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
        osc.connect(filter).connect(gain).connect(panner); osc.onended = () => { if (--left <= 0) panner.disconnect() }
        osc.start(t); osc.stop(t + 0.25)
      })
    } else if (kind === 'lock') {
      // Bright harmonic pair when a sunlight mirror locks onto the relay or receiver.
      let left = 2
      ;[659.25 * pitch, 987.77 * pitch].forEach((freq, i) => {
        const t = now + i * 0.055, osc = new OscillatorNode(ctx, { type: 'sine', frequency: freq }), gain = new GainNode(ctx, { gain: 0 })
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.18, t + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65)
        osc.connect(gain).connect(panner); osc.onended = () => { if (--left <= 0) panner.disconnect() }
        osc.start(t); osc.stop(t + 0.7)
      })
    } else if (kind === 'conduit') {
      // Warm ascending pulse as the highland conduit charges toward the ancient tree.
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: 293.66 * (0.9 + 0.6 * pitch) }), gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.12, now + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      osc.connect(gain).connect(panner); osc.onended = () => panner.disconnect(); osc.start(now); osc.stop(now + 0.25)
    } else if (kind === 'pulse') {
      // Hand-lantern call: warm fundamental + open fifth + crystalline octave shimmer.
      panner.refDistance = 12
      const tones = [[392.0 * pitch, 0.2, 1.35], [587.33 * pitch, 0.12, 1.1], [783.99 * pitch, 0.06, 0.85]] as const
      let left = tones.length
      tones.forEach(([freq, level, decay], i) => {
        const t = now + i * 0.025, osc = new OscillatorNode(ctx, { type: 'sine', frequency: freq }), gain = new GainNode(ctx, { gain: 0 })
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + 0.018); gain.gain.exponentialRampToValueAtTime(0.0001, t + decay)
        osc.connect(gain).connect(panner); osc.onended = () => { if (--left <= 0) panner.disconnect() }
        osc.start(t); osc.stop(t + decay + 0.05)
      })
    } else if (kind === 'echo') {
      // Distant forest answer tone: airy bell harmonic that carries direction clearly through trees.
      panner.refDistance = 18
      const tones = [[523.25 * pitch, 0.16, 1.5], [1046.5 * pitch, 0.05, 0.9]] as const
      let left = tones.length
      tones.forEach(([freq, level, decay]) => {
        const osc = new OscillatorNode(ctx, { type: 'sine', frequency: freq }), gain = new GainNode(ctx, { gain: 0 })
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
        osc.connect(gain).connect(panner); osc.onended = () => { if (--left <= 0) panner.disconnect() }
        osc.start(now); osc.stop(now + decay + 0.05)
      })
    } else if (kind === 'hearth') {
      // Cozy camp hearth resonance chord when listening to stored forest memories.
      panner.refDistance = 10
      const tones = [261.63, 329.63, 392.0, 523.25]
      let left = tones.length
      tones.forEach((freq, i) => {
        const t = now + i * 0.07, osc = new OscillatorNode(ctx, { type: 'triangle', frequency: freq }), gain = new GainNode(ctx, { gain: 0 })
        const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 1100 })
        gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.11, t + 0.03); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
        osc.connect(filter).connect(gain).connect(panner); osc.onended = () => { if (--left <= 0) panner.disconnect() }
        osc.start(t); osc.stop(t + 1.65)
      })
    }
  }

  /** Continuous & milestone world-event cues: vine bridge growth, light bridge laying, mist parting, seed arrival. */
  event(kind: WorldEventSound, x: number, y: number, z: number, progress = 0) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 10, positionX: x, positionY: y, positionZ: z })
    panner.connect(this.master)
    panner.connect(this.reverbSend)
    if (kind === 'vineGrow') {
      // Woody creak + warm marimba grain climbing in pitch with sunlight growth.
      let left = 2
      const release = () => { if (--left <= 0) panner.disconnect() }
      const src = new AudioBufferSourceNode(ctx, { buffer: this.noise, playbackRate: 0.7 + 0.5 * progress })
      const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 550 + 550 * progress, Q: 2.2 })
      const ng = new GainNode(ctx, { gain: 0 })
      ng.gain.setValueAtTime(0, now); ng.gain.linearRampToValueAtTime(0.055, now + 0.02); ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
      src.connect(band).connect(ng).connect(panner); src.onended = release; src.start(now, Math.random() * 2, 0.18)
      const osc = new OscillatorNode(ctx, { type: 'triangle', frequency: 246.94 * 2 ** (progress) })
      const og = new GainNode(ctx, { gain: 0 })
      og.gain.setValueAtTime(0, now); og.gain.linearRampToValueAtTime(0.075, now + 0.012); og.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
      osc.connect(og).connect(panner); osc.onended = release; osc.start(now); osc.stop(now + 0.26)
    } else if (kind === 'bridgeBuild') {
      const step = Math.max(0, Math.min(7, Math.floor(progress * 7.99)))
      const f = chimeFrequency(step)
      let left = 2
      const release = () => { if (--left <= 0) panner.disconnect() }
      for (const [ratio, level, decay] of [[1, 0.14, 0.9], [2, 0.06, 0.55]] as const) {
        const osc = new OscillatorNode(ctx, { type: 'sine', frequency: f * ratio }), g = new GainNode(ctx, { gain: 0 })
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(level, now + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, now + decay)
        osc.connect(g).connect(panner); osc.onended = release; osc.start(now); osc.stop(now + decay + 0.05)
      }
    } else if (kind === 'mistClear') {
      // Soft sweeping whoosh + open fifth mist-parting chord.
      let left = 4
      const release = () => { if (--left <= 0) panner.disconnect() }
      const src = new AudioBufferSourceNode(ctx, { buffer: this.noise, playbackRate: 0.9 })
      const filter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 220, Q: 1.1 })
      filter.frequency.exponentialRampToValueAtTime(980, now + 0.7)
      filter.frequency.exponentialRampToValueAtTime(300, now + 2.0)
      const ng = new GainNode(ctx, { gain: 0 })
      ng.gain.setValueAtTime(0, now); ng.gain.linearRampToValueAtTime(0.11, now + 0.35); ng.gain.exponentialRampToValueAtTime(0.0001, now + 2.05)
      src.connect(filter).connect(ng).connect(panner); src.onended = release; src.start(now, Math.random() * 0.8, 2.1)
      ;[0, 4, 7].forEach((step, idx) => {
        const t = now + 0.15 + idx * 0.11, osc = new OscillatorNode(ctx, { type: 'sine', frequency: chimeFrequency(step) }), g = new GainNode(ctx, { gain: 0 })
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.1, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8)
        osc.connect(g).connect(panner); osc.onended = release; osc.start(t); osc.stop(t + 1.85)
      })
    } else if (kind === 'seedAbsorb') {
      let left = 2
      const release = () => { if (--left <= 0) panner.disconnect() }
      const glide = new OscillatorNode(ctx, { type: 'sine', frequency: 659.25 }), gg = new GainNode(ctx, { gain: 0 })
      glide.frequency.exponentialRampToValueAtTime(1318.5, now + 0.22)
      gg.gain.setValueAtTime(0, now); gg.gain.linearRampToValueAtTime(0.14, now + 0.015); gg.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
      glide.connect(gg).connect(panner); glide.onended = release; glide.start(now); glide.stop(now + 0.48)
      const bell = new OscillatorNode(ctx, { type: 'sine', frequency: 1046.5 }), bg = new GainNode(ctx, { gain: 0 })
      bg.gain.setValueAtTime(0, now + 0.06); bg.gain.linearRampToValueAtTime(0.1, now + 0.08); bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.95)
      bell.connect(bg).connect(panner); bell.onended = release; bell.start(now + 0.06); bell.stop(now + 1.0)
    }
  }

  private crackle(ctx: AudioContext) {
    const now = ctx.currentTime, src = new AudioBufferSourceNode(ctx, { buffer: this.noise, playbackRate: 1.4 + Math.random() * 0.8 })
    const band = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 1800 + Math.random() * 2400, Q: 2.2 }), gain = new GainNode(ctx, { gain: 0 })
    const pan = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 4.5, rolloffFactor: 1.4, positionX: this.firePos.x, positionY: this.firePos.y, positionZ: this.firePos.z })
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.07 + Math.random() * 0.06, now + 0.004); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055)
    src.connect(band).connect(gain).connect(pan).connect(this.master)
    src.onended = () => pan.disconnect()
    src.start(now, Math.random() * 2.5, 0.07)
  }

  private build(ctx: AudioContext) {
    this.ctx = ctx
    this.master = new GainNode(ctx, { gain: this.volume * 0.8 })
    // Gentle master soft limiter keeps stacked pentatonic chimes + multi-layer score cleanly below clipping.
    const limiter = new DynamicsCompressorNode(ctx, { threshold: -14, knee: 12, ratio: 3, attack: 0.008, release: 0.18 })
    this.master.connect(limiter).connect(ctx.destination)
    // Procedural stereo forest impulse response (2.1 s, pink-damped exponential tail, zero external audio files).
    const irLen = Math.floor(ctx.sampleRate * 2.1), ir = ctx.createBuffer(2, irLen, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const c = ir.getChannelData(ch)
      let lp = 0
      for (let i = 0; i < irLen; i++) {
        const decay = (1 - i / irLen) ** 2.6
        lp = lp * 0.72 + (Math.random() * 2 - 1) * 0.28
        c[i] = lp * decay
      }
    }
    const reverb = new ConvolverNode(ctx, { buffer: ir })
    const revLow = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2600 })
    this.reverbSend = new GainNode(ctx, { gain: 0.26 })
    this.reverbSend.connect(reverb).connect(revLow).connect(this.master)
    // Wind: looping noise through a gust-responsive low-pass, plus high-altitude pine bough air.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noise = noise
    const source = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true })
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 420, Q: 0.6 })
    const sway = new OscillatorNode(ctx, { frequency: 0.09 }), swayDepth = new GainNode(ctx, { gain: 180 })
    sway.connect(swayDepth).connect(filter.frequency)
    this.windFilter = filter
    this.wind = new GainNode(ctx, { gain: 0 })
    source.connect(filter).connect(this.wind).connect(this.master)
    source.start(); sway.start()
    const pineSrc = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 0.85 })
    const pineBand = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 980, Q: 0.7 }), pineLow = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2100 })
    this.pine = new GainNode(ctx, { gain: 0 })
    pineSrc.connect(pineBand).connect(pineLow).connect(this.pine).connect(this.master)
    pineSrc.start(0, 1.1)
    // Crickets: smooth sine-gated trills instead of raw square steps (which caused harsh digital clicks).
    this.crickets = new GainNode(ctx, { gain: 0 }); this.crickets.connect(this.master)
    for (const [freq, trill, rhythm, pan] of [[4300, 31, 1.4, -0.6], [3900, 27, 1.1, 0.55]]) {
      const tone = new OscillatorNode(ctx, { frequency: freq }), level = new GainNode(ctx, { gain: 0.028 })
      const trillGate = new GainNode(ctx, { gain: 0.5 }), trillLfo = new OscillatorNode(ctx, { type: 'sine', frequency: trill })
      const chirpGate = new GainNode(ctx, { gain: 0.5 }), chirpLfo = new OscillatorNode(ctx, { type: 'sine', frequency: rhythm })
      trillLfo.connect(new GainNode(ctx, { gain: 0.5 })).connect(trillGate.gain)
      chirpLfo.connect(new GainNode(ctx, { gain: 0.5 })).connect(chirpGate.gain)
      tone.connect(level).connect(trillGate).connect(chirpGate).connect(new StereoPannerNode(ctx, { pan })).connect(this.crickets)
      tone.start(); trillLfo.start(); chirpLfo.start()
    }
    this.birds = new GainNode(ctx, { gain: 0 }); this.birds.connect(this.master)
    // Wetland water: start immediately at a non-zero buffer offset (`start(0, offset)` rather than delayed `start(when)`).
    const lap = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 0.7 })
    const lapFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 520, Q: 0.8 }), swell = new GainNode(ctx, { gain: 0.6 })
    for (const [rate, depth] of [[0.31, 0.25], [0.17, 0.15]]) { const lfo = new OscillatorNode(ctx, { frequency: rate }); lfo.connect(new GainNode(ctx, { gain: depth })).connect(swell.gain); lfo.start() }
    this.water = new GainNode(ctx, { gain: 0 })
    lap.connect(lapFilter).connect(swell).connect(this.water).connect(this.master)
    lap.start(0, 1.3)
    this.frogs = new GainNode(ctx, { gain: 0 }); this.frogs.connect(this.master)
    this.music = new GainNode(ctx, { gain: 1 }); this.music.connect(this.master)
    // High-passed music reverb send keeps bass notes clean while giving arps, pads, and bells forest hall warmth.
    const musicRevHP = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 240 })
    const musicRevGain = new GainNode(ctx, { gain: 0.22 })
    this.music.connect(musicRevHP).connect(musicRevGain).connect(this.reverbSend)
    // The glen's waterfall: a steady rush placed at its foot, balanced so echo-stone chimes remain intelligible.
    const fall = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 1.1 })
    const fallBand = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 900, Q: 0.5 }), fallLow = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2400 })
    const fallPan = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 6.5, rolloffFactor: 1.4, positionX: (WATERFALL.x + PLUNGE_POOL.x) / 2, positionY: 2, positionZ: WATERFALL.z })
    fall.connect(fallBand).connect(fallLow).connect(new GainNode(ctx, { gain: 0.42 })).connect(fallPan).connect(this.master)
    fall.start(0, 0.7)
    // Surf in the crescent cove: a darker rush that swells and draws back every few seconds.
    const surf = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 0.6 })
    const surfLow = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 700, Q: 0.5 }), surfSwell = new GainNode(ctx, { gain: 0.35 })
    const surfWave = new OscillatorNode(ctx, { frequency: 0.13 }); surfWave.connect(new GainNode(ctx, { gain: 0.3 })).connect(surfSwell.gain); surfWave.start()
    const surfPan = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 10, rolloffFactor: 1.2, positionX: 0, positionY: -2, positionZ: -92 })
    surf.connect(surfLow).connect(surfSwell).connect(surfPan).connect(this.master)
    surf.start(0, 2.1)
    // Campfire soft low flame bed right at the hearth.
    const fire = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 0.55 })
    const fireLow = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 340, Q: 0.8 })
    const firePan = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 3.5, rolloffFactor: 1.6, positionX: this.firePos.x, positionY: this.firePos.y, positionZ: this.firePos.z })
    fire.connect(fireLow).connect(new GainNode(ctx, { gain: 0.18 })).connect(firePan).connect(this.master)
    fire.start(0, 0.4)
  }

  /** Look-ahead scheduler: queues every beat that starts within the next 0.25 s, so timing never depends on frame rate. */
  private scheduleMusic(ctx: AudioContext) {
    if (this.musicLayers === 0) { this.nextBeat = 0; return }
    if (this.nextBeat < ctx.currentTime) this.nextBeat = ctx.currentTime + 0.1 // first beat, or catching up after a pause
    while (this.nextBeat < ctx.currentTime + 0.25) {
      this.playBeat(ctx, this.beatIndex++, this.nextBeat)
      this.nextBeat += BEAT
    }
  }

  /** One beat of the score: pad, arpeggio, bass, bells and shimmer join in as more voices are allowed (see music.ts). */
  private playBeat(ctx: AudioContext, index: number, t: number) {
    const layers = this.musicLayers, bar = Math.floor(index / BEATS_PER_BAR), beat = index % BEATS_PER_BAR, chord = chordAt(bar)
    if (beat === 0) for (const n of chord) this.note(ctx, midiFreq(n + 12), t, BEAT * 4.3, 0.03, 1.2, 'sine')
    if (layers >= 2) {
      const steps = layers >= 6 ? 4 : 2 // eighths, or sixteenths once the tree's trunk is lit
      for (let s = 0; s < steps; s++) this.note(ctx, midiFreq(arpNote(bar, beat * steps + s)), t + (s * BEAT) / steps, 0.9, 0.028, 0.01, 'triangle', s % 2 ? 0.45 : -0.45)
    }
    if (layers >= 3 && beat % 2 === 0) this.note(ctx, midiFreq(chord[0] - 12), t, 2, 0.07, 0.02, 'sine')
    if (layers >= 4 && (beat === 1 || layers >= 7)) this.note(ctx, midiFreq(bellNote(bar, Math.random())), t, 2.4, 0.025, 0.005, 'sine', Math.random() * 1.2 - 0.6)
    if (layers >= 5 && beat === 0) this.note(ctx, midiFreq(chord[2] + 24), t, BEAT * 4.5, 0.012, 1.6, 'sine')
    if (layers >= 7 && this.secretBonus > 0 && beat % 2 === 1) {
      // Solved side secrets add delicate upper-octave resonance bells during the finale without altering layer count.
      const tone = bellNote(bar, ((index + this.secretBonus) % 5) / 5) + 12
      this.note(ctx, midiFreq(tone), t + BEAT * 0.5, 2.2, 0.01 + 0.004 * this.secretBonus, 0.01, 'sine', (beat === 1 ? -0.5 : 0.5))
    }
  }

  /** A single enveloped oscillator into the music bus. */
  private note(ctx: AudioContext, frequency: number, t: number, duration: number, level: number, attack: number, type: OscillatorType, pan = 0) {
    const osc = new OscillatorNode(ctx, { type, frequency }), gain = new GainNode(ctx, { gain: 0 })
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + attack); gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain)
    if (pan) {
      const panner = new StereoPannerNode(ctx, { pan })
      gain.connect(panner).connect(this.music)
      osc.onended = () => panner.disconnect()
    } else gain.connect(this.music)
    osc.start(t); osc.stop(t + duration + 0.05)
  }

  /** A frog call: two or three low, buzzy pulses from a random direction. */
  private croak(ctx: AudioContext) {
    const start = ctx.currentTime + 0.05, base = 95 + Math.random() * 70, pulses = 2 + Math.floor(Math.random() * 2)
    const pan = new StereoPannerNode(ctx, { pan: Math.random() * 1.6 - 0.8 }), tone = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 900 })
    tone.connect(pan).connect(this.frogs)
    for (let i = 0; i < pulses; i++) {
      const t = start + i * 0.22, osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: base }), gain = new GainNode(ctx, { gain: 0 })
      osc.frequency.setValueAtTime(base * 1.08, t); osc.frequency.exponentialRampToValueAtTime(base * 0.92, t + 0.14)
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.12, t + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      osc.connect(gain).connect(tone); osc.start(t); osc.stop(t + 0.18)
    }
  }

  /** Two to four quick rising whistles from a random direction. */
  private birdPhrase(ctx: AudioContext) {
    const start = ctx.currentTime + 0.05, base = 2400 + Math.random() * 1400, notes = 2 + Math.floor(Math.random() * 3)
    const pan = new StereoPannerNode(ctx, { pan: Math.random() * 1.6 - 0.8 }); pan.connect(this.birds); pan.connect(this.reverbSend)
    let left = notes
    const release = () => { if (--left <= 0) pan.disconnect() }
    for (let i = 0; i < notes; i++) {
      const t = start + i * 0.16, osc = new OscillatorNode(ctx, { frequency: base }), gain = new GainNode(ctx, { gain: 0 })
      osc.frequency.setValueAtTime(base * (1 + i * 0.05), t); osc.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.09)
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.07, t + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      osc.connect(gain).connect(pan); osc.onended = release; osc.start(t); osc.stop(t + 0.14)
    }
  }

  /** Soft distant two-note night owl hoot echoing lightly across the pines. */
  private owlCall(ctx: AudioContext) {
    const start = ctx.currentTime + 0.05, pan = new StereoPannerNode(ctx, { pan: (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.45) })
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 750 })
    filter.connect(pan).connect(this.master)
    filter.connect(this.reverbSend)
    let left = 2
    const release = () => { if (--left <= 0) { pan.disconnect(); filter.disconnect() } }
    for (const [offset, f0, f1, dur] of [[0, 370, 340, 0.28], [0.42, 345, 312, 0.52]] as const) {
      const t = start + offset, osc = new OscillatorNode(ctx, { type: 'sine', frequency: f0 }), gain = new GainNode(ctx, { gain: 0 })
      osc.frequency.exponentialRampToValueAtTime(f1, t + dur)
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.042, t + 0.06); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(gain).connect(filter); osc.onended = release; osc.start(t); osc.stop(t + dur + 0.05)
    }
  }
}
export const soundscape = new Soundscape()
