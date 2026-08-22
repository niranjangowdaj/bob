<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap" rel="stylesheet">
</svelte:head>

<script>
  import { onMount } from 'svelte';

  let audioCtx;
  let oscillators = [];
  let gainNode;
  let colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF'];
  let isPlaying = false;

  const hexToFreq = (hex) => {
    const val = parseInt(hex.slice(1), 16);
    return 100 + (val % 400); // Maps hex to 100-500Hz
  };

  function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.1;
    gainNode.connect(audioCtx.destination);
  }

  function startSound() {
    if (!audioCtx) initAudio();
    if (isPlaying) return;

    oscillators = colors.map(color => {
      const osc = audioCtx.createOscillator();
      const freq = hexToFreq(color);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      const panner = audioCtx.createStereoPanner();
      panner.pan.setValueAtTime((Math.random() * 2) - 1, audioCtx.currentTime);
      
      osc.connect(panner);
      panner.connect(gainNode);
      osc.start();
      return osc;
    });
    isPlaying = true;
  }

  function stopSound() {
    oscillators.forEach(osc => osc.stop());
    oscillators = [];
    isPlaying = false;
  }

  function updateColor(index, e) {
    colors[index] = e.target.value;
    if (isPlaying) {
      stopSound();
      startSound();
    }
  }
</script>

<main>
  <div class="container">
    <h1>Chroma Chord</h1>
    <p>Ambient generative synthesis via color palette.</p>

    <div class="palette">
      {#each colors as color, i}
        <div class="swatch-wrap">
          <input type="color" value={color} on:input={(e) => updateColor(i, e)} />
          <span class="hex">{color}</span>
        </div>
      {/each}
    </div>

    <button class="action-btn" on:click={isPlaying ? stopSound : startSound}>
      {isPlaying ? 'Stop Resonance' : 'Initiate Soundscape'}
    </button>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background: #0f172a;
    color: #f8fafc;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  .container {
    text-align: center;
    padding: 2rem;
    max-width: 600px;
  }

  h1 { font-weight: 700; letter-spacing: -0.05em; margin-bottom: 0.5rem; }

  .palette {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }

  .swatch-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }

  input[type="color"] {
    width: 80px;
    height: 80px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    background: none;
  }

  .action-btn {
    background: #38bdf8;
    color: #0f172a;
    border: none;
    padding: 1rem 2rem;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
  }

  .action-btn:hover { transform: scale(1.05); background: #7dd3fc; }
</style>