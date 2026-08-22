import Visualizer from '../components/Visualizer';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white overflow-hidden">
      <header className="fixed top-0 left-0 w-full p-6 z-50 flex justify-between items-center bg-gradient-to-b from-[#0a0a0c] to-transparent">
        <h1 className="text-2xl font-bold tracking-tighter italic">ECHO<span className="text-indigo-500">CHAMBER</span></h1>
        <nav>
          <button className="px-4 py-2 text-sm border border-white/10 rounded-full hover:bg-white/5 transition-all">
            Live Stream
          </button>
        </nav>
      </header>
      
      <Visualizer />

      <footer className="fixed bottom-6 left-6 z-50">
        <p className="text-xs text-white/40 uppercase tracking-widest">
          Real-time Sentiment Clustering / AI Engine v1.0
        </p>
      </footer>
    </main>
  );
}