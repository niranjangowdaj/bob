import { initSynth, setOscillatorFrequency } from './synth.js';

const minFreq = 80;
const maxFreq = 800;

function hexToFreq(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / (max - min) + (g < b ? 6 : 0); break;
      case g: h = (b - r) / (max - min) + 2; break;
      case b: h = (r - g) / (max - min) + 4; break;
    }
    h /= 6;
  }
  return minFreq + h * (maxFreq - minFreq);
}

function updateSynthFromColor(hex) {
  const freq = hexToFreq(hex);
  setOscillatorFrequency(freq);
}

document.addEventListener('DOMContentLoaded', () => {
  const colorPicker = document.getElementById('colorPicker');
  if (!colorPicker) return;

  initSynth();
  
  const updateFromPicker = () => {
    const color = colorPicker.value;
    updateSynthFromColor(color);
    const url = new URL(window.location);
    url.searchParams.set('color', color);
    window.history.replaceState({ path: url.href }, '', url);
  };

  const urlParams = new URLSearchParams(window.location.search);
  const savedColor = urlParams.get('color') || colorPicker.value;
  colorPicker.value = savedColor;
  updateSynthFromColor(savedColor);
  
  const url = new URL(window.location);
  url.searchParams.set('color', savedColor);
  window.history.replaceState({ path: url.href }, '', url);

  colorPicker.addEventListener('input', updateFromPicker);
});