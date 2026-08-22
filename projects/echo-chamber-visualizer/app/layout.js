import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Echo Chamber Visualizer',
  description: 'Interactive 3D sentiment mapping of social media discourse.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased selection:bg-indigo-500/30`}>
        <div className="relative min-h-screen flex flex-col">
          <header className="border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
            <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Echo Chamber
              </div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-widest hidden sm:block">
                Real-time Sentiment Analysis
              </div>
            </nav>
          </header>
          <main className="flex-grow">
            {children}
          </main>
          <footer className="py-8 text-center text-slate-600 text-sm border-t border-slate-800/60">
            <p>© {new Date().getFullYear()} Echo Chamber Visualizer. Powered by Vercel AI & Three.js</p>
          </footer>
        </div>
      </body>
    </html>
  );
}