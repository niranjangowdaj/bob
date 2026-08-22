import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playAmbientSound, stopAmbientSound } from '../lib/audio';
import { saveTaskProgress } from '../lib/db';
import { Task } from '../types';

interface TimerProps {
  activeTask: Task | null;
  onTimerComplete: (taskId: string) => void;
}

export const Timer: React.FC<TimerProps> = ({ activeTask, onTimerComplete }) => {
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = useCallback(() => {
    if (isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAmbientSound();
    } else {
      playAmbientSound();
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (activeTask) onTimerComplete(activeTask.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setIsActive(!isActive);
  }, [isActive, activeTask, onTimerComplete]);

  useEffect(() => {
    if (activeTask) {
      setTimeLeft(25 * 60);
      setIsActive(false);
    }
  }, [activeTask]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAmbientSound();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl transition-all">
      <h2 className="text-slate-400 text-sm uppercase tracking-widest mb-4">
        {activeTask ? activeTask.title : 'Select a task to orbit'}
      </h2>
      
      <div className="text-6xl font-light text-white font-mono mb-8 tabular-nums">
        {formatTime(timeLeft)}
      </div>

      <button
        onClick={toggleTimer}
        disabled={!activeTask}
        className={`px-8 py-3 rounded-full font-medium transition-all transform hover:scale-105 active:scale-95 ${
          isActive 
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30' 
            : 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {isActive ? 'Stabilize Orbit' : 'Initiate Focus'}
      </button>

      <div className="mt-6 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-400 transition-all duration-1000 ease-linear"
          style={{ width: `${((25 * 60 - timeLeft) / (25 * 60)) * 100}%` }}
        />
      </div>
    </div>
  );
};