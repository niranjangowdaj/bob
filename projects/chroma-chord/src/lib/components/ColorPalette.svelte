<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  let colors = [{ id: '1', value: '#ff0000' }];

  function addColor() {
    const newId = Math.random().toString(36).substring(2, 9);
    colors = [...colors, { id: newId, value: '#000000' }];
  }

  function removeColor(idToRemove: string) {
    colors = colors.filter(c => c.id !== idToRemove);
  }
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

  :root {
    --bg-dark: #121212;
    --bg-darker: #1e1e1e;
    --bg-card: #1a1a1a;
    --text-primary: #ffffff;
    --text-secondary: #b0b0b0;
    --accent: #4cc9f0;
    --accent-hover: #3a9bd8;
    --danger: #ff6b6b;
    --danger-hover: #ff5252;
    --border-radius: 8px;
    --transition: 0.2s ease;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-dark);
    color: var(--text-primary);
  }

  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    background-color: var(--bg-card);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  h1 {
    text-align: center;
    color: var(--text-primary);
    margin-bottom: 2rem;
    font-weight: 600;
    letter-spacing: -0.5px;
  }

  .color-grid {
    display: grid;
    gap: 1.5rem;
  }

  .color-slot {
    position: relative;
    display: flex;
    align-items: center;
    padding: 1rem;
    background-color: var(--bg-darker);
    border-radius: var(--border-radius);
    transition: var(--transition);
    overflow: hidden;
  }

  .color-slot:hover {
    background-color: #262626;
  }

  .color-swatch {
    position: relative;
    flex-shrink: 0;
    width: 70px;
    height: 70px;
    border-radius: 6px;
    margin-right: 1.5rem;
    overflow: hidden;
    transition: background-color 0.3s ease;
  }

  .color-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .hex-value {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    color: var(--text-primary);
    text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    font-size: 0.9rem;
    font-weight: 500;
    pointer-events: none;
    padding: 0.25rem;
    background: rgba(0, 0, 0, 0.3);
  }

  .remove-button {
    background: transparent;
    border: none;
    color: var(--danger);
    font-size: 1.8rem;
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: var(--transition);
    margin-left: auto;
  }

  .remove-button:hover {
    background-color: rgba(255, 107, 107, 0.15);
    color: var(--danger-hover);
    transform: scale(1.1);
  }

  .add-button {
    width: 100%;
    padding: 1rem;
    background-color: var(--accent);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    margin-top: 2rem;
    letter-spacing: 0.5px;
  }

  .add-button:hover {
    background-color: var(--accent-hover);
    transform: translateY(-2px);
  }

  @media (max-width: 480px) {
    .container {
      padding: 1.5rem;
    }

    .color-slot {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .color-swatch {
      margin-right: 0;
      margin-bottom: 1rem;
    }

    .hex-value {
      position: static;
      margin-top: 0.5rem;
      background: none;
      text-shadow: none;
    }

    .remove-button {
      margin-left: 0;
      margin-top: 0.5rem;
      align-self: flex-end;
    }
  }
</style>

<div class="container">
  <h1>Color Palette</h1>
  <div class="color-grid">
    {#each colors as color (color.id)}
      <div class="color-slot" transition:fade transition:fly={{ y: 20, duration: 300 }}>
        <div class="color-swatch" style="background-color: {color.value};">
          <input 
            type="color" 
            bind:value={color.value}
            class="color-input"
          />
          <div class="hex-value" style="pointer-events: none;">{color.value}</div>
        </div>
        {#if colors.length > 1}
          <button class="remove-button" on:click={() => removeColor(color.id)} aria-label="Remove color">
            ×
          </button>
        {/else}
          <div class="remove-button-placeholder"></div>
        {/if}
      </div>
    {/each}
  </div>
  <button class="add-button" on:click={addColor}>
    + Add Color
  </button>
</div>