export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private oscillators: Map<string, OscillatorNode> = new Map();
  private gains: Map<string, GainNode> = new Map();

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);
  }

  private hexToFrequency(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Map RGB values to a frequency range (110Hz to 880Hz)
    const brightness = (r + g + b) / 765;
    return 110 * Math.pow(2, brightness * 3);
  }

  public updatePalette(colors: string[]): void {
    const activeIds = new Set(colors);

    // Remove oscillators not in the current palette
    for (const id of this.oscillators.keys()) {
      if (!activeIds.has(id)) {
        this.stopOscillator(id);
      }
    }

    // Add/Update oscillators
    colors.forEach((hex, index) => {
      if (!this.oscillators.has(hex)) {
        this.startOscillator(hex, this.hexToFrequency(hex), index);
      }
    });
  }

  private startOscillator(id: string, freq: number, index: number): void {
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = index % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    this.oscillators.set(id, osc);
    this.gains.set(id, gain);
  }

  private stopOscillator(id: string): void {
    const osc = this.oscillators.get(id);
    const gain = this.gains.get(id);

    if (osc && gain) {
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
      osc.stop(this.ctx.currentTime + 0.5);
      this.oscillators.delete(id);
      this.gains.delete(id);
    }
  }

  public setVolume(value: number): void {
    this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
  }
}