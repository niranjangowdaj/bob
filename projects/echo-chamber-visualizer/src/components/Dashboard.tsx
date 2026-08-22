"use client";

import React, { useState, useEffect } from 'react';

interface SentimentStats {
  totalAnalyzed: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  averageSentiment: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<SentimentStats>({
    totalAnalyzed: 1240,
    positiveCount: 620,
    negativeCount: 310,
    neutralCount: 310,
    averageSentiment: 0.45,
  });

  const [isLive, setIsLive] = useState<boolean>(true);

  // Simulated real-time streaming update
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        totalAnalyzed: prev.totalAnalyzed + 1,
        positiveCount: prev.positiveCount + (Math.random() > 0.5 ? 1 : 0),
        averageSentiment: Number((Math.random() * 0.8 - 0.4).toFixed(2)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl w-full max-w-md text-slate-100 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Echo Chamber Stats
        </h2>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
            isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
          }`}
        >
          {isLive ? 'Live Streaming' : 'Paused'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
          <p className="text-slate-400 text-xs mb-1">Total Analyzed</p>
          <p className="text-2xl font-mono font-bold">{stats.totalAnalyzed.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
          <p className="text-slate-400 text-xs mb-1">Avg Sentiment</p>
          <p className={`text-2xl font-mono font-bold ${stats.averageSentiment >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.averageSentiment > 0 ? '+' : ''}{stats.averageSentiment}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Positive</span>
          <span className="font-semibold text-emerald-400">{((stats.positiveCount / stats.totalAnalyzed) * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${(stats.positiveCount / stats.totalAnalyzed) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Powered by Vercel AI SDK • Real-time Clustering Engine
        </p>
      </div>
    </div>
  );
}