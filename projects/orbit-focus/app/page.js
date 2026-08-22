"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export default function OrbitFocus() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef(null);
  const audioContext = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const draw = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw Orbit Path
      ctx.beginPath();
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();

      // Draw Orbital Body
      const angle = (time / 2000) % (Math.PI * 2);
      const x = centerX + 100 * Math.cos(angle);
      const y = centerY + 100 * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#60a5fa' : '#94a3b8';
      ctx.fill();
      ctx.shadowBlur = 15;
      ctx.shadowColor = isActive ? '#60a5fa' : '#94a3b8';

      animationFrameId = requestAnimationFrame(draw);
    };

    draw(0);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive]);

  const toggleTimer = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    setIsActive(!isActive);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="text-center z-10">
        <h1 className="text-4xl font-light tracking-widest mb-2">ORBIT FOCUS</h1>
        <p className="text-slate-400 mb-8">Maintain your gravity field</p>
        
        <div className="relative w-80 h-80 mx-auto mb-8">
          <canvas 
            ref={canvasRef} 
            width={320} 
            height={320} 
            className="absolute inset-0"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-mono font-bold tracking-tight">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <button
          onClick={toggleTimer}
          className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] font-medium"
        >
          {isActive ? 'Pause Session' : 'Start Orbit'}
        </button>
      </div>

      <div className="fixed bottom-8 text-slate-600 text-sm">
        IndexedDB: Ready
      </div>
    </main>
  );
}