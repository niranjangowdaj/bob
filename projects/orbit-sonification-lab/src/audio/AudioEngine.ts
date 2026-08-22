import { CelestialBody, AudioScale, WaveformType, SynthPatch } from '../types/astronomy';

// Frequencies for Root Note C0 = 16.35 Hz
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALE_INTERVALS: Record<AudioScale, number[]> = {
  pentatonic: [0, 2, 4, 7, 9],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pythagorean: [0, 2, 4, 7, 9, 12],
  cosmic: [0, 3, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

interface PlanetVoice {
  oscillator1: OscillatorNode;
  oscillator2: OscillatorNode;
  subOscillator: OscillatorNode;
  filter: BiquadFilterNode;
  gainNode: GainNode;
  panner: StereoPannerNode;
  patch: SynthPatch;
  baseOctave: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Effects
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayGain: GainNode | null = null;

  // Global settings
  private activeScale: AudioScale = 'cosmic';
  private rootNote: string = 'C';
  private rootMidiNote: number = 60; // C4
  private masterVolume: number = 0.7;

  // Planet Voices mapping planet ID -> PlanetVoice
  private planetVoices: Map<string, PlanetVoice> = new Map();

  // Alignment Drone / Resonance Synth
  private resonanceOsc1: OscillatorNode | null = null;
  private resonanceOsc2: OscillatorNode | null = null;
  private resonanceGain: GainNode | null = null;
  private resonanceFilter: BiquadFilterNode | null = null;

  // Audio Recording
  private mediaDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recording: boolean = false;

  private isInitialized: boolean = false;

  constructor() {
    this.rootMidiNote = this.noteToMidi('C', 4);
  }

  /**
   * Initialize Web Audio Context and audio graph
   */
  public async init(): Promise<void> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Compressor / Limiter
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

    // Analyser for visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    // Connect Main Chain: MasterGain -> Compressor -> Analyser -> Output
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Setup Media Stream Destination for recording
    this.mediaDestination = this.ctx.createMediaStreamDestination();
    this.analyser.connect(this.mediaDestination);

    // Setup Reverb Send Node
    this.reverbNode = this.ctx.createConvolver();
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.reverbNode.buffer = this.createImpulseResponse(3.5, 2.0);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    // Setup Delay Send Node
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(0.375, this.ctx.currentTime); // Dotted eighth feel
    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    // Delay loop setup: Delay -> Feedback -> Delay
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.masterGain);

    // Setup Orbital Resonance Drone Synth
    this.setupResonanceSynth();

    this.isInitialized = true;
  }

  public async resume(): Promise<void> {
    if (!this.ctx) {
      await this.init();
    } else if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Generate procedural cosmic impulse response for spacious reverb
   */
  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Exponential decay combined with high-frequency dampening simulation
      const factor = Math.pow(1 - n, decay) * (1 - Math.sin(n * Math.PI * 8) * 0.1);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    return impulse;
  }

  /**
   * Create continuous voice for a specific celestial body
   */
  public createPlanetVoice(planet: CelestialBody): void {
    if (!this.ctx || !this.masterGain || !this.reverbNode || !this.delayNode) return;

    if (this.planetVoices.has(planet.id)) {
      this.removePlanetVoice(planet.id);
    }

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();

    const patch = planet.synthPatch || {
      waveform: 'sine',
      attack: 0.1,
      release: 0.5,
      cutoff: 1200,
      detune: 5,
      volume: 0.6,
    };

    osc1.type = patch.waveform as OscillatorType;
    osc2.type = patch.waveform === 'sine' ? 'triangle' : 'sine';
    subOsc.type = 'sine';

    osc1.detune.setValueAtTime(-patch.detune, this.ctx.currentTime);
    osc2.detune.setValueAtTime(patch.detune, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(patch.cutoff, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Initial silent gain
    gainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    // Routing: Oscs -> Filter -> Gain -> Panner -> Master + Sends
    osc1.connect(filter);
    osc2.connect(filter);
    subOsc.connect(filter);

    filter.connect(gainNode);
    gainNode.connect(panner);

    panner.connect(this.masterGain);
    panner.connect(this.reverbNode);
    panner.connect(this.delayNode);

    osc1.start();
    osc2.start();
    subOsc.start();

    this.planetVoices.set(planet.id, {
      oscillator1: osc1,
      oscillator2: osc2,
      subOscillator: subOsc,
      filter,
      gainNode,
      panner,
      patch,
      baseOctave: planet.octave ?? 3,
    });
  }

  /**
   * Update real-time planet synth voice based on distance, speed, and 3D screen position
   */
  public updatePlanetAudio(planet: CelestialBody, cameraDist: number = 50): void {
    if (!this.ctx) return;
    let voice = this.planetVoices.get(planet.id);

    if (!voice) {
      this.createPlanetVoice(planet);
      voice = this.planetVoices.get(planet.id);
      if (!voice) return;
    }

    if (planet.muted) {
      voice.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      return;
    }

    const now = this.ctx.currentTime;

    // Calculate Pitch from normalized velocity and semi-major axis (distance from star)
    const pitchOffset = Math.floor((1 / Math.sqrt(Math.max(0.2, planet.semiMajorAxis / 10))) * 7);
    const targetFreq = this.quantizeToScale(planet.octave || voice.baseOctave, pitchOffset);

    // Frequency glide with smooth exponential ramping
    voice.oscillator1.frequency.setTargetAtTime(targetFreq, now, 0.08);
    voice.oscillator2.frequency.setTargetAtTime(targetFreq * 1.002, now, 0.08);
    voice.subOscillator.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);

    // Dynamic Filter Cutoff based on orbital speed (higher velocity = brighter tone)
    const normalizedSpeed = Math.min(Math.max(planet.currentVelocity || 1, 0.2), 3.0);
    const cutoffFreq = Math.min(8000, Math.max(200, voice.patch.cutoff * normalizedSpeed));
    voice.filter.frequency.setTargetAtTime(cutoffFreq, now, 0.1);

    // Spatial Panning: Map X position (-50 to +50) to Stereo Panner (-1 to +1)
    const panX = Math.max(-1, Math.min(1, planet.position.x / (cameraDist * 0.6)));
    voice.panner.pan.setTargetAtTime(panX, now, 0.05);

    // Gain calculated from proximity and patch volume setting
    const distanceToOrigin = Math.sqrt(planet.position.x ** 2 + planet.position.z ** 2);
    const proximityMultiplier = Math.max(0.1, 1 - distanceToOrigin / 150);
    const targetGain = (voice.patch.volume || 0.5) * proximityMultiplier * (this.masterVolume > 0 ? 1 : 0);

    voice.gainNode.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  /**
   * Trigger high-pitched crystal chime on periapsis passage (closest orbital approach)
   */
  public triggerPeriapsisChime(planet: CelestialBody): void {
    if (!this.ctx || !this.masterGain || !this.reverbNode || planet.muted) return;

    const now = this.ctx.currentTime;

    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    const chimeFilter = this.ctx.createBiquadFilter();

    const freq = this.quantizeToScale((planet.octave || 3) + 2, 4);

    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq, now);
    chimeOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

    chimeFilter.type = 'highpass';
    chimeFilter.frequency.setValueAtTime(1200, now);

    chimeGain.gain.setValueAtTime(0.001, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.3 * (planet.synthPatch?.volume || 0.6), now + 0.02);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    chimeOsc.connect(chimeFilter);
    chimeFilter.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chimeGain.connect(this.reverbNode);

    chimeOsc.start(now);
    chimeOsc.stop(now + 0.85);
  }

  /**
   * Setup ambient resonance drone when planetary alignments happen
   */
  private setupResonanceSynth(): void {
    if (!this.ctx || !this.masterGain) return;

    this.resonanceOsc1 = this.ctx.createOscillator();
    this.resonanceOsc2 = this.ctx.createOscillator();
    this.resonanceFilter = this.ctx.createBiquadFilter();
    this.resonanceGain = this.ctx.createGain();

    this.resonanceOsc1.type = 'triangle';
    this.resonanceOsc2.type = 'sine';

    const rootFreq = this.midiToFreq(this.rootMidiNote - 12);
    this.resonanceOsc1.frequency.setValueAtTime(rootFreq, this.ctx.currentTime);
    this.resonanceOsc2.frequency.setValueAtTime(rootFreq * 1.5, this.ctx.currentTime); // Perfect fifth

    this.resonanceFilter.type = 'lowpass';
    this.resonanceFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.resonanceGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.resonanceOsc1.connect(this.resonanceFilter);
    this.resonanceOsc2.connect(this.resonanceFilter);
    this.resonanceFilter.connect(this.resonanceGain);
    this.resonanceGain.connect(this.masterGain);

    if (this.reverbNode) {
      this.resonanceGain.connect(this.reverbNode);
    }

    this.resonanceOsc1.start();
    this.resonanceOsc2.start();
  }

  /**
   * Swell alignment resonance when planets align in phase
   */
  public triggerResonanceSwelling(intensity: number): void {
    if (!this.ctx || !this.resonanceGain || !this.resonanceFilter) return;

    const clampedIntensity = Math.min(Math.max(intensity, 0), 1);
    const now = this.ctx.currentTime;

    const targetGain = clampedIntensity * 0.4;
    const targetFilter = 300 + clampedIntensity * 1800;

    this.resonanceGain.gain.setTargetAtTime(targetGain, now, 0.2);
    this.resonanceFilter.frequency.setTargetAtTime(targetFilter, now, 0.3);
  }

  /**
   * Quantize requested octave and scale degree to real frequency
   */
  private quantizeToScale(octave: number, degree: number): number {
    const scale = SCALE_INTERVALS[this.activeScale] || SCALE_INTERVALS.cosmic;
    const scaleLength = scale.length;

    const octaveShift = Math.floor(degree / scaleLength);
    const normalizedDegree = ((degree % scaleLength) + scaleLength) % scaleLength;

    const semitones = scale[normalizedDegree] + (octave + octaveShift) * 12;
    const midiNote = this.rootMidiNote + semitones;

    return this.midiToFreq(midiNote);
  }

  private noteToMidi(noteName: string, octave: number): number {
    const cleanNote = noteName.toUpperCase();
    const noteIndex = NOTE_NAMES.indexOf(cleanNote);
    return (octave + 1) * 12 + (noteIndex >= 0 ? noteIndex : 0);
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public removePlanetVoice(planetId: string): void {
    const voice = this.planetVoices.get(planetId);
    if (voice && this.ctx) {
      const now = this.ctx.currentTime;
      voice.gainNode.gain.setTargetAtTime(0.0001, now, 0.05);
      setTimeout(() => {
        try {
          voice.oscillator1.stop();
          voice.oscillator2.stop();
          voice.subOscillator.stop();
          voice.oscillator1.disconnect();
          voice.oscillator2.disconnect();
          voice.subOscillator.disconnect();
          voice.filter.disconnect();
          voice.gainNode.disconnect();
          voice.panner.disconnect();
        } catch {
          // Ignore if already stopped
        }
      }, 100);
      this.planetVoices.delete(planetId);
    }
  }

  // --- Configuration Mutators ---

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setScale(scale: AudioScale): void {
    this.activeScale = scale;
  }

  public setRootKey(key: string): void {
    this.rootNote = key;
    this.rootMidiNote = this.noteToMidi(key, 4);
    if (this.ctx && this.resonanceOsc1 && this.resonanceOsc2) {
      const rootFreq = this.midiToFreq(this.rootMidiNote - 12);
      this.resonanceOsc1.frequency.setValueAtTime(rootFreq, this.ctx.currentTime);
      this.resonanceOsc2.frequency.setValueAtTime(rootFreq * 1.5, this.ctx.currentTime);
    }
  }

  public setReverbMix(mix: number): void {
    if (this.ctx && this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(Math.max(0, Math.min(1, mix)), this.ctx.currentTime, 0.05);
    }
  }

  public setDelayMix(mix: number): void {
    if (this.ctx && this.delayGain) {
      this.delayGain.gain.setTargetAtTime(Math.max(0, Math.min(1, mix)), this.ctx.currentTime, 0.05);
    }
  }

  public setDelayFeedback(feedback: number): void {
    if (this.ctx && this.delayFeedbackGain) {
      this.delayFeedbackGain.gain.setTargetAtTime(Math.max(0, Math.min(0.95, feedback)), this.ctx.currentTime, 0.05);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  // --- Audio Recording Methods ---

  public startRecording(): boolean {
    if (!this.mediaDestination || this.recording) return false;

    try {
      this.recordedChunks = [];
      const stream = this.mediaDestination.stream;
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? { mimeType: 'audio/ogg;codecs=opus' }
        : undefined;

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.recording = true;
      return true;
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      return false;
    }
  }

  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.recording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.recording = false;
        this.recordedChunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  public isRecording(): boolean {
    return this.recording;
  }

  public dispose(): void {
    this.planetVoices.forEach((_, id) => this.removePlanetVoice(id));
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance export
export const audioEngine = new AudioEngine();
export default audioEngine;