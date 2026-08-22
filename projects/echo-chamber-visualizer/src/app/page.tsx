"use client";

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph = dynamic(() => import('@/components/GraphVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white font-sans">
      <div className="animate-pulse text-xl tracking-widest uppercase">Initializing Echo Chamber...</div>
    </div>
  ),
});

export default function Home() {
  const [hashtag, setHashtag] = useState<string>('#tech');
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <header className="absolute top-0 left-0 z-10 w-full p-6 flex justify-between items-center bg-gradient-to-b from-slate-950 to-transparent">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Echo Chamber</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Real-time Sentiment Clustering</p>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={hashtag}
            onChange={(e) => setHashtag(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Search hashtag..."
          />
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20">
            Analyze
          </button>
        </div>
      </header>

      {isClient && (
        <div className="fixed inset-0 z-0">
          <ForceGraph hashtag={hashtag} />
        </div>
      )}

      <footer className="absolute bottom-6 left-6 z-10">
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 text-[10px] text-slate-500 max-w-xs">
          <p className="mb-2 uppercase font-semibold text-slate-300">Live Telemetry</p>
          <div className="flex justify-between mb-1">
            <span>Sentiment Velocity</span>
            <span className="text-emerald-400">+12.4/s</span>
          </div>
          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-2/3 animate-pulse" />
          </div>
        </div>
      </footer>
    </main>
  );
}