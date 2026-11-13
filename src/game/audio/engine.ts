import { Vector3, type Camera } from 'three'
import { ambienceMix, chimeFrequency, nextChirpDelay, nextCroakDelay } from './soundscape'
import { BEAT, BEATS_PER_BAR, arpNote, bellNote, chordAt, midiFreq } from './music'
import { WATERFALL } from '../world/zones/sideLayout'
import { PLUNGE_POOL } from '../world/zones/wetlandLayout'
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
  private water!: GainNode
  private frogs!: GainNode
  private noise!: AudioBuffer
  private birdTimer = 1
  private croakTimer = 1
  private music!: GainNode
  private musicLayers = 0
  private nextBeat = 0
  private beatIndex = 0
  private volume = 0.7
  private readonly forward = new Vector3()
  /** Flower chimes requested so far (counted even while silent; read by the debug hook). */
  chimes = 0
  /** Wading splashes requested so far (also read by the debug hook). */
  splashes = 0
  /** Music voices currently playing (0–7; read by the debug hook). */
  get layers() { return this.musicLayers }

  /** How many score voices play; they join or leave on the next beat. */
  setMusicLayers(layers: number) { this.musicLayers = layers }

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

  /** Per frame: ambience follows the time of day and the zone, the listener follows the camera, birds and frogs are scheduled. */
  update(dt: number, blend: number, camera: Camera, wetland = 0) {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const mix = ambienceMix(blend, wetland), now = ctx.currentTime
    this.water.gain.setTargetAtTime(mix.water, now, SMOOTHING)
    this.frogs.gain.setTargetAtTime(mix.frogs, now, SMOOTHING)
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
    this.scheduleMusic(ctx)
    if ((this.croakTimer -= dt) <= 0) {
      this.croakTimer = nextCroakDelay(Math.random())
      if (mix.frogs > 0.05) this.croak(ctx)
    }
  }

  /** Footsteps requested so far (read by the debug hook). */
  footsteps = 0
  /** One footstep on `surface` at (x, y, z), placed in 3D; `strength` in [0, 1] (running steps are firmer). */
  footstep(surface: 'grass' | 'dirt' | 'wood', x: number, y: number, z: number, strength: number) {
    const ctx = this.ctx
    this.footsteps++
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime, out = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 1.5, positionX: x, positionY: y, positionZ: z })
    out.connect(this.master)
    const burst = (filter: BiquadFilterOptions, level: number, length: number, delay = 0, rate = 1) => {
      const source = new AudioBufferSourceNode(ctx, { buffer: this.noise, playbackRate: rate * (0.85 + Math.random() * 0.3) }), gain = new GainNode(ctx, { gain: 0 }), t = now + delay
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
      source.connect(new BiquadFilterNode(ctx, filter)).connect(gain).connect(out)
      source.start(t, Math.random() * 2.5, length + 0.05)
    }
    const s = 0.6 + 0.4 * strength
    if (surface === 'grass') {
      // Two quick brushes of high, airy noise: blades parting around the foot.
      burst({ type: 'highpass', frequency: 2600 + Math.random() * 900, Q: 0.6 }, 0.05 * s, 0.11)
      burst({ type: 'bandpass', frequency: 4200, Q: 0.8 }, 0.03 * s, 0.09, 0.045)
    } else if (surface === 'dirt') {
      burst({ type: 'lowpass', frequency: 520 + Math.random() * 160, Q: 0.9 }, 0.13 * s, 0.09, 0, 0.6)
      burst({ type: 'bandpass', frequency: 1800, Q: 1.2 }, 0.02 * s, 0.06, 0.01)
    } else {
      // Wood: a hollow knock on the planks.
      const osc = new OscillatorNode(ctx, { type: 'triangle', frequency: 150 + Math.random() * 40 }), gain = new GainNode(ctx, { gain: 0 })
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.12 * s, now + 0.005); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
      osc.connect(gain).connect(out); osc.start(now); osc.stop(now + 0.16)
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
    const panner = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 2, positionX: x, positionY: y, positionZ: z })
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.18 + 0.22 * strength, now + 0.012); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
    source.connect(band).connect(gain).connect(panner).connect(this.master)
    source.start(now, Math.random() * 2, 0.32)
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
    this.noise = noise
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
    // Wetland water: the same noise, darker, with a slow irregular lapping swell.
    const lap = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 0.7 })
    const lapFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 520, Q: 0.8 }), swell = new GainNode(ctx, { gain: 0.6 })
    for (const [rate, depth] of [[0.31, 0.25], [0.17, 0.15]]) { const lfo = new OscillatorNode(ctx, { frequency: rate }); lfo.connect(new GainNode(ctx, { gain: depth })).connect(swell.gain); lfo.start() }
    this.water = new GainNode(ctx, { gain: 0 })
    lap.connect(lapFilter).connect(swell).connect(this.water).connect(this.master)
    lap.start(1.3)
    this.frogs = new GainNode(ctx, { gain: 0 }); this.frogs.connect(this.master)
    this.music = new GainNode(ctx, { gain: 1 }); this.music.connect(this.master)
    // The glen's waterfall (2026-11-12): a steady rush placed at its foot; distance alone fades it, so it guides the ear.
    const fall = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 1.1 })
    const fallBand = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 900, Q: 0.5 }), fallLow = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 2600 })
    const fallPan = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 7, rolloffFactor: 1.3, positionX: (WATERFALL.x + PLUNGE_POOL.x) / 2, positionY: 2, positionZ: WATERFALL.z })
    fall.connect(fallBand).connect(fallLow).connect(new GainNode(ctx, { gain: 0.55 })).connect(fallPan).connect(this.master)
    fall.start(0.7)
    // Surf in the crescent cove (2026-11-13): a darker rush that swells and draws back every few seconds.
    const surf = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true, playbackRate: 0.6 })
    const surfLow = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 700, Q: 0.5 }), surfSwell = new GainNode(ctx, { gain: 0.35 })
    const surfWave = new OscillatorNode(ctx, { frequency: 0.13 }); surfWave.connect(new GainNode(ctx, { gain: 0.3 })).connect(surfSwell.gain); surfWave.start()
    const surfPan = new PannerNode(ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 10, rolloffFactor: 1.2, positionX: 0, positionY: -2, positionZ: -92 })
    surf.connect(surfLow).connect(surfSwell).connect(surfPan).connect(this.master)
    surf.start(2.1)
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
  }

  /** A single enveloped oscillator into the music bus. */
  private note(ctx: AudioContext, frequency: number, t: number, duration: number, level: number, attack: number, type: OscillatorType, pan = 0) {
    const osc = new OscillatorNode(ctx, { type, frequency }), gain = new GainNode(ctx, { gain: 0 })
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + attack); gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain)
    if (pan) gain.connect(new StereoPannerNode(ctx, { pan })).connect(this.music)
    else gain.connect(this.music)
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
