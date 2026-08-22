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

	public updatePalette(colors: string[]): void {
		const activeKeys = new Set(colors);

		// Remove oscillators for removed colors
		for (const key of this.oscillators.keys()) {
			if (!activeKeys.has(key)) {
				this.stopOscillator(key);
			}
		}

		// Add/Update oscillators for current colors
		colors.forEach((hex, index) => {
			if (!this.oscillators.has(hex)) {
				this.startOscillator(hex, index);
			}
		});
	}

	private startOscillator(hex: string, index: number): void {
		if (this.ctx.state === 'suspended') {
			this.ctx.resume();
		}

		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		// Map hex to frequency (pseudo-random but deterministic based on hex)
		const freq = this.hexToFrequency(hex, index);
		
		osc.type = 'sine';
		osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
		
		gain.gain.setValueAtTime(0, this.ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 1);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start();
		this.oscillators.set(hex, osc);
		this.gains.set(hex, gain);
	}

	private stopOscillator(hex: string): void {
		const gain = this.gains.get(hex);
		const osc = this.oscillators.get(hex);

		if (gain && osc) {
			gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
			osc.stop(this.ctx.currentTime + 1);
			
			this.gains.delete(hex);
			this.oscillators.delete(hex);
		}
	}

	private hexToFrequency(hex: string, index: number): number {
		const val = parseInt(hex.replace('#', ''), 16);
		// Map to a musical scale (C Major pentatonic range)
		const base = 110 * Math.pow(2, (index % 4));
		return base + (val % 200);
	}

	public setVolume(value: number): void {
		this.masterGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
	}
}