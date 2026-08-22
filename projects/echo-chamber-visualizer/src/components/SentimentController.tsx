"use client";

import React, { useState } from 'react';

interface SentimentControllerProps {
  onAnalyze: (hashtag: string) => Promise<void>;
  isLoading: boolean;
}

export default function SentimentController({ onAnalyze, isLoading }: SentimentControllerProps) {
  const [hashtag, setHashtag] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashtag.trim()) return;
    await onAnalyze(hashtag.replace('#', ''));
  };

  return (
    <div className="w-full max-w-md p-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Echo Chamber</h2>
      <p className="text-blue-100/70 text-sm mb-6">
        Enter a hashtag to map the sentiment landscape in real-time.
      </p>
      
      <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold">#</span>
          <input
            type="text"
            value={hashtag}
            onChange={(e) => setHashtag(e.target.value)}
            placeholder="e.g. climatechange"
            className="w-full pl-8 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !hashtag}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Mapping...
            </span>
          ) : (
            'Generate Graph'
          )}
        </button>
      </form>
    </div>
  );
}