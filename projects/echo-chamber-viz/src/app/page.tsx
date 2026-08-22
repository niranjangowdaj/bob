"use client";

import React, { useState } from 'react';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="px-6 py-8 md:px-12">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-600">
            EchoChamber.ai
          </h1>
          <button 
            onClick={() => setIsProcessing(!isProcessing)}
            className="px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            {isProcessing ? 'Analyzing...' : 'Connect Feed'}
          </button>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-12 md:py-20 text-center">
        <h2 className="text-5xl md:text-7xl font-extrabold mb-6 text-slate-900">
          Visualize your <span className="text-indigo-500">digital bubble.</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          Analyze the diversity of your social media feed using privacy-first local processing. 
          Identify cognitive biases and break free from algorithmic echo chambers.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[600px]">
          <Dashboard />
        </div>
      </section>

      <footer className="px-6 py-12 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} EchoChamber.ai • Local-first, privacy-focused analysis.</p>
      </footer>
    </main>
  );
}