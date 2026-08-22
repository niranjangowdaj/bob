<script lang="ts">
  import { onMount } from 'svelte';

  export let analyser: AnalyserNode;
  export let colors: string[] = [];

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;

  const draw = () => {
    if (!ctx || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < colors.length; i++) {
      const slice = bufferLength / colors.length;
      const value = dataArray[Math.floor(i * slice)];
      const radius = (value / 255) * (Math.min(canvas.width, canvas.height) * 0.4);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = colors[i];
      ctx.stroke();
    }

    animationId = requestAnimationFrame(draw);
  };

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };
    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  });
</script>

<div class="visualizer-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400&display=swap');

  .visualizer-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    background: #0a0a0f;
    border-radius: 12px;
    box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>