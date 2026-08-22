import React, { useState, useEffect } from 'react';
import GravityCanvas from '@/components/GravityCanvas';
import Timer from '@/components/Timer';
import { db } from '@/lib/db';
import { Task } from '@/types';

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      const allTasks = await db.tasks.toArray();
      setTasks(allTasks);
    };
    loadTasks();
  }, []);

  const handleTaskComplete = async (id: string) => {
    await db.tasks.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <main className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      <header className="absolute top-0 left-0 p-8 z-10 pointer-events-none">
        <h1 className="text-3xl font-light tracking-widest text-indigo-400">ORBIT FOCUS</h1>
        <p className="text-sm text-slate-500 uppercase tracking-tighter">Gravity-bound productivity</p>
      </header>

      <div className="flex-grow relative w-full h-full">
        <GravityCanvas 
          tasks={tasks} 
          activeTaskId={activeTaskId} 
        />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-slate-950 to-transparent z-20">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <Timer 
            activeTaskId={activeTaskId} 
            onComplete={() => activeTaskId && handleTaskComplete(activeTaskId)}
          />
          
          <div className="flex gap-4 overflow-x-auto pb-4 w-full justify-center">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`px-4 py-2 rounded-full border transition-all ${
                  activeTaskId === task.id 
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200' 
                    : 'border-slate-700 hover:border-slate-500 text-slate-400'
                }`}
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}