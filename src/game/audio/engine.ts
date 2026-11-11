import { Vector3, type Camera } from 'three'
import { ambienceMix, chimeFrequency, nextChirpDelay } from './soundscape'
// Web Audio soundscape synthesised at runtime, so there are no audio files to source or license. The context is created on
// the first user gesture (browser autoplay policy) and suspended whenever the game is not playing.
const SMOOTHING = 0.4
export type SoundState = 'off' | 'unavailable' | AudioContextState

class Soundscape {
  private ctx: AudioContext | null = null
  private failed = false
  private master!: GainNode
  private wind!: GainNode
  private birds!: GainNode
  private crickets!: GainNode
  private birdTimer = 1
  private volume = 0.7
  private readonly forward = new Vector3()
  /** Flower chimes requested so far (counted even while silent; read by the debug hook). */
  chimes = 0

  get state(): SoundState { return this.failed ? 'unavailable' : this.ctx?.state ?? 'off' }

  /** Call from a user gesture. Safe to call repeatedly. */
  start() {
    if (this.failed) return
    try {
      if (!this.ctx) this.build(new AudioContext())
      this.ctx?.resume().catch(() => { this.failed = true })
    } catch {
      this.failed = true // no Web Audio: the game stays silent
    }
  }

  setVolume(volume: number) {
    this.volume = volume
    if (this.ctx) this.master.gain.setTargetAtTime(volume * 0.8, this.ctx.currentTime, 0.05)
  }

  setActive(active: boolean) {
    if (!this.ctx) return
    const change = active ? this.ctx.resume() : this.ctx.suspend()
    change.catch(() => { this.failed = true })
  }

  /** Per frame: ambience levels follow the time of day, the listener follows the camera, birds are scheduled. */
  update(dt: number, blend: number, camera: Camera) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const mix = ambienceMix(blend), now = ctx.currentTime
    this.wind.gain.setTargetAtTime(mix.wind, now, SMOOTHING)
    this.birds.gain.setTargetAtTime(mix.birds, now, SMOOTHING)
    this.crickets.gain.setTargetAtTime(mix.crickets * 0.5, now, SMOOTHING)
    const l = ctx.listener
    camera.getWorldDirection(this.forward)
    if (l.positionX) {
      l.positionX.value = camera.position.x; l.positionY.value = camera.position.y; l.positionZ.value = camera.position.z
      l.forwardX.value = this.forward.x; l.forwardY.value = this.forward.y; l.forwardZ.value = this.forward.z
    }
    if ((this.birdTimer -= dt) <= 0) {
      this.birdTimer = nextChirpDelay(Math.random())
      if (mix.birds > 0.05) this.birdPhrase(ctx)
    }
  }

  /** Bell-like note placed in 3D so it comes from its source's direction; `delay` (s) staggers notes into chords. */
  chime(index: number, x: number, y: number, z: number, delay = 0) {
    const ctx = this.ctx
    this.chimes++
    if (!ctx || ctx.state !== 'running') return
    const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2, positionX: x, positionY: y, positionZ: z })
    panner.connect(this.master)
    const f = chimeFrequency(index), now = ctx.currentTime + delay
    for (const [ratio, level, decay] of [[1, 0.35, 2.2], [2.005, 0.12, 1.2], [3.01, 0.05, 0.6]]) {
      const osc = new OscillatorNode(ctx, { frequency: f * ratio }), gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      osc.connect(gain).connect(panner); osc.start(now); osc.stop(now + decay + 0.05)
    }
  }

  private build(ctx: AudioContext) {
    this.ctx = ctx
    this.master = new GainNode(ctx, { gain: this.volume * 0.8 }); this.master.connect(ctx.destination)
    // Wind: looping noise through a slowly swaying low-pass.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const source = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true })
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 420, Q: 0.6 })
    const sway = new OscillatorNode(ctx, { frequency: 0.09 }), swayDepth = new GainNode(ctx, { gain: 220 })
    sway.connect(swayDepth).connect(filter.frequency)
    this.wind = new GainNode(ctx, { gain: 0 })
    source.connect(filter).connect(this.wind).connect(this.master)
    source.start(); sway.start()
    // Crickets: two high tones, each gated by a fast trill inside a slower chirp rhythm, panned apart.
    this.crickets = new GainNode(ctx, { gain: 0 }); this.crickets.connect(this.master)
    for (const [freq, trill, rhythm, pan] of [[4300, 31, 1.4, -0.6], [3900, 27, 1.1, 0.55]]) {
      const tone = new OscillatorNode(ctx, { frequency: freq }), level = new GainNode(ctx, { gain: 0.03 })
      // Square LFOs swing ±0.5 around a 0.5 base, so each gate opens and closes fully.
      const trillGate = new GainNode(ctx, { gain: 0.5 }), trillLfo = new OscillatorNode(ctx, { type: 'square', frequency: trill })
      const chirpGate = new GainNode(ctx, { gain: 0.5 }), chirpLfo = new OscillatorNode(ctx, { type: 'square', frequency: rhythm })
      trillLfo.connect(new GainNode(ctx, { gain: 0.5 })).connect(trillGate.gain)
      chirpLfo.connect(new GainNode(ctx, { gain: 0.5 })).connect(chirpGate.gain)
      tone.connect(level).connect(trillGate).connect(chirpGate).connect(new StereoPannerNode(ctx, { pan })).connect(this.crickets)
      tone.start(); trillLfo.start(); chirpLfo.start()
    }
    this.birds = new GainNode(ctx, { gain: 0 }); this.birds.connect(this.master)
  }

  /** Two to four quick rising whistles from a random direction. */
  private birdPhrase(ctx: AudioContext) {
    const start = ctx.currentTime + 0.05, base = 2400 + Math.random() * 1400, notes = 2 + Math.floor(Math.random() * 3)
    const pan = new StereoPannerNode(ctx, { pan: Math.random() * 1.6 - 0.8 }); pan.connect(this.birds)
    for (let i = 0; i < notes; i++) {
      const t = start + i * 0.16, osc = new OscillatorNode(ctx, { frequency: base }), gain = new GainNode(ctx, { gain: 0 })
      osc.frequency.setValueAtTime(base * (1 + i * 0.05), t); osc.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.09)
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.07, t + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      osc.connect(gain).connect(pan); osc.start(t); osc.stop(t + 0.14)
    }
  }
}
export const soundscape = new Soundscape()
