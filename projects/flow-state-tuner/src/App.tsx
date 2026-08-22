import React, { useState, useEffect, useRef, useCallback } from 'react';

interface AudioState {
  isPlaying: boolean;
  mouseSpeed: number;
}

const App: React.FC = () => {
  const [audioState, setAudioState] = useState<AudioState>({ isPlaying: false, mouseSpeed: 0 });
  const audioContext = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTime = useRef<number>(Date.now());

  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      oscillator.current = audioContext.current.createOscillator();
      gainNode.current = audioContext.current.createGain();
      
      oscillator.current.type = 'sine';
      oscillator.current.frequency.setValueAtTime(440, audioContext.current.currentTime);
      gainNode.current.gain.setValueAtTime(0, audioContext.current.currentTime);
      
      oscillator.current.connect(gainNode.current);
      gainNode.current.connect(audioContext.current.destination);
      oscillator.current.start();
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!audioContext.current || !audioState.isPlaying) return;

    const now = Date.now();
    const dt = now - lastTime.current;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / (dt || 1);

    lastMousePos.current = { x: e.clientX, y: e.clientY };
    lastTime.current = now;

    const frequency = 200 + Math.min(speed * 50, 600);
    const volume = Math.min(speed * 0.1, 0.3);

    oscillator.current?.frequency.setTargetAtTime(frequency, audioContext.current.currentTime, 0.1);
    gainNode.current?.gain.setTargetAtTime(volume, audioContext.current.currentTime, 0.1);

    setAudioState(prev => ({ ...prev, mouseSpeed: speed }));
  };

  const toggleAudio = () => {
    initAudio();
    if (audioContext.current) {
      if (audioState.isPlaying) {
        gainNode.current?.gain.setTargetAtTime(0, audioContext.current.currentTime, 0.5);
      } else {
        audioContext.current.resume();
        gainNode.current?.gain.setTargetAtTime(0.1, audioContext.current.currentTime, 0.5);
      }
      setAudioState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-sans overflow-hidden transition-colors duration-1000"
      onMouseMove={handleMouseMove}
      style={{ background: `radial-gradient(circle at center, #1e293b 0%, #020617 100%)` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap');
        body { font-family: 'Inter', sans-serif; margin: 0; }
      `}</style>

      <div className="text-center z-10 px-4">
        <h1 className="text-5xl font-bold mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Flow State Tuner
        </h1>
        <p className="text-slate-400 mb-12 max-w-md">
          Move your mouse to modulate the frequency. Find your rhythm.
        </p>
        
        <button 
          onClick={toggleAudio}
          className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          {audioState.isPlaying ? 'Pause Synthesis' : 'Start Flow'}
        </button>
      </div>

      <div className="fixed bottom-10 text-slate-600 text-sm tracking-widest uppercase">
        Speed: {audioState.mouseSpeed.toFixed(2)} px/ms
      </div>
    </div>
  );
};

export default App;