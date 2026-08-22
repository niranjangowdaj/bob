export class AudioEngine {
  private static instance: AudioEngine;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.setupBinauralBeats();
    this.setupWhiteNoise();
  }

  private setupBinauralBeats(): void {
    if (!this.ctx || !this.masterGain) return;

    const pannerL = this.ctx.createStereoPanner();
    pannerL.pan.value = -1;
    const pannerR = this.ctx.createStereoPanner();
    pannerR.pan.value = 1;

    this.leftOsc = this.ctx.createOscillator();
    this.rightOsc = this.ctx.createOscillator();

    this.leftOsc.connect(pannerL).connect(this.masterGain);
    this.rightOsc.connect(pannerR).connect(this.masterGain);

    this.leftOsc.start();
    this.rightOsc.start();
  }

  private setupWhiteNoise(): void {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.05;

    this.noiseNode.connect(this.noiseGain).connect(this.masterGain);
    this.noiseNode.start();
  }

  public updateModulation(speed: number): void {
    if (!this.ctx || !this.leftOsc || !this.rightOsc || !this.noiseGain) return;

    const baseFreq = 200;
    const beatFreq = Math.min(speed / 10, 30);

    this.leftOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
    this.rightOsc.frequency.setTargetAtTime(baseFreq + beatFreq, this.ctx.currentTime, 0.1);
    
    const noiseLevel = Math.min(speed / 500, 0.2);
    this.noiseGain.gain.setTargetAtTime(noiseLevel, this.ctx.currentTime, 0.1);
  }

  public setVolume(value: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
    }
  }
}