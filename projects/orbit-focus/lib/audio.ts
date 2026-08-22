export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private isPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private initNodes(): void {
    if (!this.ctx || this.masterGain) return;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.2;
    this.masterGain.connect(this.ctx.destination);
  }

  public startFocusSoundscape(): void {
    if (!this.ctx) return;
    this.initNodes();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const frequencies = [110, 164.81, 220]; // A2, E3, A3
    
    frequencies.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
      
      gain.gain.setValueAtTime(0, this.ctx!.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx!.currentTime + 2);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start();
      this.oscillators.push(osc);
    });

    this.isPlaying = true;
  }

  public stopFocusSoundscape(): void {
    this.oscillators.forEach((osc) => {
      osc.stop();
      osc.disconnect();
    });
    this.oscillators = [];
    this.isPlaying = false;
  }

  public updateGravityIntensity(intensity: number): void {
    if (!this.masterGain) return;
    // intensity 0 to 1 mapping to volume
    this.masterGain.gain.setTargetAtTime(intensity * 0.3, this.ctx!.currentTime, 0.1);
  }
}

export const audioEngine = new AudioEngine();