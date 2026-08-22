export type TaskStatus = 'pending' | 'active' | 'completed';

export interface Task {
  id: string;
  title: string;
  duration: number; // in seconds
  elapsed: number; // in seconds
  status: TaskStatus;
  createdAt: number;
  color: string;
}

export interface Orbit {
  taskId: string;
  mass: number;
  distance: number;
  angle: number;
  velocity: number;
  isStable: boolean;
}

export interface AudioSettings {
  isEnabled: boolean;
  volume: number;
  frequency: number;
  oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

export interface GravityConfig {
  gravityConstant: number;
  friction: number;
  timeScale: number;
}