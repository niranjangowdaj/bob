"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const EchoVisualizer = dynamic(() => import('@/components/EchoVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-emerald-400 font-mono">
      Initializing Neural Network...
    </div>
  ),
});

export default function EchoChamberPage() {
  const [hashtag, setHashtag] = useState('technology');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30">
      <header className="fixed top-0 left-0 w-full z-50 p-6 flex justify-between items-center bg-gradient-to-b from-slate-950 to-transparent">
        <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
          ECHO CHAMBER VISUALIZER
        </h1>
        <div className="flex gap-4">
          <input
            type="text"
            value={hashtag}
            onChange={(e) => setHashtag(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-all"
            placeholder="Enter hashtag..."
          />
          <button className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors">
            Analyze
          </button>
        </div>
      </header>

      <div className="relative h-screen w-full">
        {isClient && <EchoVisualizer hashtag={hashtag} />}
      </div>

      <footer className="fixed bottom-0 left-0 w-full p-6 text-slate-500 text-sm font-light">
        <p>Real-time sentiment clustering via Vercel AI SDK • 3D Force-Directed Graph</p>
      </footer>
    </main>
  );
}