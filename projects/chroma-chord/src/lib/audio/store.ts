import { writable, derived, type Writable } from 'svelte/store';

export interface PaletteColor {
	id: string;
	hex: string;
	frequency: number;
	active: boolean;
}

export interface AudioState {
	isPlaying: boolean;
	volume: number;
	attack: number;
	release: number;
}

export const audioState: Writable<AudioState> = writable({
	isPlaying: false,
	volume: 0.5,
	attack: 0.1,
	release: 1.5
});

export const palette: Writable<PaletteColor[]> = writable([
	{ id: '1', hex: '#FF5733', frequency: 220, active: true },
	{ id: '2', hex: '#33FF57', frequency: 330, active: true },
	{ id: '3', hex: '#3357FF', frequency: 440, active: true },
	{ id: '4', hex: '#F333FF', frequency: 550, active: true }
]);

export const activeFrequencies = derived(palette, ($palette) => 
	$palette.filter((color) => color.active).map((color) => color.frequency)
);

export function updateColor(id: string, hex: string, frequency: number): void {
	palette.update((current) =>
		current.map((color) => (color.id === id ? { ...color, hex, frequency } : color))
	);
}

export function toggleColor(id: string): void {
	palette.update((current) =>
		current.map((color) => (color.id === id ? { ...color, active: !color.active } : color))
	);
}