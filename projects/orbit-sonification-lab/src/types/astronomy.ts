export type WaveformType = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'fm-bell' | 'glass-pad';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface CelestialBody {
  id: string;
  name: string;
  color: string;
  secondaryColor?: string;
  radius: number; // Visual size in render units
  mass: number; // Gravitational mass
  distance: number; // Semi-major axis from center star
  eccentricity: number; // Orbital eccentricity (0 = circular, 0.9 = highly elliptical)
  orbitalPeriod: number; // Relative orbital time
  currentAngle: number; // Current orbital angle in radians
  position: [number, number, number];
  velocity: [number, number, number];
  trailHistory: [number, number, number][];
  isSelected?: boolean;
  isMuted?: boolean;
  
  // Audio synthesis parameters
  audioOctave: number; // Octave offset (e.g. 2 to 6)
  waveform: WaveformType;
  detune?: number; // Cents detune (-100 to +100)
  panning?: number; // Stereo pan (-1 to 1)
  
  // Visual effects
  atmosphereGlow?: boolean;
  rings?: boolean;
  ringColor?: string;
  highlightPulse?: number; // Triggered on periapsis/resonance (0 to 1)
}

export interface AudioScale {
  id: string;
  name: string;
  description: string;
  notes: string[]; // Note names e.g., ['C', 'D', 'E', 'G', 'A']
  semitones: number[]; // Relative semitones from root [0, 2, 4, 7, 9]
  category: 'cosmic' | 'ambient' | 'pentatonic' | 'microtonal' | 'classical';
}

export interface SynthSettings {
  masterVolume: number; // 0 to 1
  scaleId: string;
  rootFrequency: number; // e.g. 432 Hz or 440 Hz
  reverbMix: number; // 0 to 1
  delayMix: number; // 0 to 1
  delayTime: number; // Delay time multiplier (0.1 to 1.0s)
  resonanceHarmonics: boolean; // Play extra octave harmonics during planetary alignments
  periapsisTrigger: boolean; // Trigger percussion/accent note when at periapsis
  alignmentTrigger: boolean; // Trigger chime on planetary alignment
  spatialAudio: boolean; // Enable 3D panning based on planet coordinates
  bpm: number; // Global pulse rate
}

export interface PhysicsSettings {
  simulationSpeed: number; // Speed multiplier (0 to 5, 0 = paused)
  isPaused: boolean;
  gravitationalConstant: number; // Relative G constant
  nBodyGravity: boolean; // Enable true N-body mutual attraction vs Keplerian central gravity
  collisionsEnabled: boolean;
  trailLength: number; // Max points stored for orbital path visualization (20 - 300)
  showOrbitalGrid: boolean;
  showVectors: boolean;
}

export interface SystemPreset {
  id: string;
  name: string;
  description: string;
  category: 'Solar' | 'Resonant' | 'Exotic' | 'Chaos';
  scaleId: string;
  synthSettings?: Partial<SynthSettings>;
  bodies: Array<{
    id: string;
    name: string;
    color: string;
    secondaryColor?: string;
    radius: number;
    mass: number;
    distance: number;
    eccentricity: number;
    audioOctave: number;
    waveform: WaveformType;
    atmosphereGlow?: boolean;
    rings?: boolean;
    ringColor?: string;
  }>;
}

export interface AlignmentEvent {
  id: string;
  planetIds: string[];
  angleDifference: number; // Radians threshold
  position: [number, number, number];
  intensity: number; // 0 to 1 strength based on proximity and body masses
  timestamp: number;
}

export interface PeriapsisEvent {
  planetId: string;
  planetName: string;
  velocity: number;
  timestamp: number;
}

export interface AudioRecorderState {
  isRecording: boolean;
  recordingTime: number; // Seconds
  audioBlobUrl: string | null;
  audioBlob: Blob | null;
}

export interface CameraViewPreset {
  id: 'perspective' | 'top' | 'follow' | 'cinematic';
  label: string;
}