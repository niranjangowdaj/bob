import { useEffect, useRef, useState } from 'react';

interface MouseTrackerProps {
  onSpeedChange: (speed: number) => void;
}

export const MouseTracker = ({ onSpeedChange }: MouseTrackerProps) => {
  const [speed, setSpeed] = useState<number>(0);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTime = useRef<number>(Date.now());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastTime.current;
      
      if (dt > 50) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const currentSpeed = Math.min(distance / dt, 2);

        setSpeed(currentSpeed);
        onSpeedChange(currentSpeed);

        lastMousePos.current = { x: e.clientX, y: e.clientY };
        lastTime.current = now;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [onSpeedChange]);

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0">
      <div 
        className="transition-all duration-300 ease-out rounded-full bg-indigo-500/10 blur-3xl"
        style={{
          width: `${100 + speed * 100}px`,
          height: `${100 + speed * 100}px`,
          transform: `scale(${1 + speed})`,
        }}
      />
      <div className="absolute bottom-10 text-slate-400 font-sans text-xs tracking-widest uppercase">
        Flow Velocity: {speed.toFixed(2)}
      </div>
    </div>
  );
};