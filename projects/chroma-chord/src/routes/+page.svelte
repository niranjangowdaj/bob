<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let audioContext: AudioContext;
  let oscillators: OscillatorNode[] = [];
  let gainNode: GainNode;
  let isPlaying = false;
  let colors: string[] = ['#FF5733', '#33FF57', '#3357FF', '#F333FF'];
  let activeColor = colors[0];

  function hexToFreq(hex: string): number {
    const val = parseInt(hex.slice(1), 16);
    return 100 + (val % 400);
  }

  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0.2;
    }
  }

  function playSound(hex: string) {
    if (!audioContext) initAudio();
    
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hexToFreq(hex), audioContext.currentTime);
    
    const envelope = audioContext.createGain();
    envelope.gain.setValueAtTime(0, audioContext.currentTime);
    envelope.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    envelope.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);
    
    osc.connect(envelope);
    envelope.connect(gainNode);
    
    osc.start();
    osc.stop(audioContext.currentTime + 2);
  }

  function handleColorClick(color: string) {
    activeColor = color;
    if (browser) playSound(color);
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="container">
  <header>
    <h1>Chroma Chord</h1>
    <p>Translate visual palettes into ambient soundscapes.</p>
  </header>

  <div class="palette-grid">
    {#each colors as color}
      <button 
        class="color-swatch" 
        style="background-color: {color};"
        on:click={() => handleColorClick(color)}
        aria-label="Play color {color}"
      ></button>
    {/each}
  </div>

  <div class="visualizer-stage" style="border-color: {activeColor}">
    <div class="pulse" style="background-color: {activeColor}"></div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background: #0f0f0f;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  .container {
    text-align: center;
    width: 90%;
    max-width: 600px;
  }

  h1 { font-weight: 300; letter-spacing: 2px; margin-bottom: 0.5rem; }

  .palette-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin: 3rem 0;
  }

  .color-swatch {
    aspect-ratio: 1;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .color-swatch:hover {
    transform: scale(1.05);
  }

  .visualizer-stage {
    width: 100px;
    height: 100px;
    border: 2px solid;
    border-radius: 50%;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: border-color 0.5s ease;
  }

  .pulse {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    animation: ripple 2s infinite;
  }

  @keyframes ripple {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }
</style>