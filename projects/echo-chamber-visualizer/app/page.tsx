import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GraphData } from '@/types/graph';
import { analyzeSentiment } from '@/lib/sentiment';

const GraphCanvas = dynamic(() => import('@/components/GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-cyan-400">
      Initializing Neural Mapping...
    </div>
  ),
});

export default function EchoChamberDashboard() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [activeTag, setActiveTag] = useState<string>('#TechTrends');

  useEffect(() => {
    const fetchData = async () => {
      const sentimentData = await analyzeSentiment(activeTag);
      setData(sentimentData);
    };
    fetchData();
  }, [activeTag]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <header className="absolute top-0 left-0 z-10 w-full p-6 flex items-center justify-between pointer-events-none">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Echo Chamber Visualizer
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Real-time Sentiment Clustering</p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          {['#TechTrends', '#GlobalNews', '#Markets'].map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTag === tag 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
                  : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      <div className="absolute inset-0 z-0">
        <GraphCanvas data={data} />
      </div>

      <footer className="absolute bottom-6 left-6 z-10 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 max-w-xs">
          <h3 className="text-sm font-semibold mb-1">System Status</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Stream Connected
          </div>
        </div>
      </footer>
    </main>
  );
}