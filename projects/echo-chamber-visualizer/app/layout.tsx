import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Echo Chamber Visualizer',
  description: 'Interactive 3D sentiment mapping of social media discourse.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30`}>
        <div className="relative min-h-screen flex flex-col">
          <header className="fixed top-0 w-full z-50 p-6 flex justify-between items-center bg-gradient-to-b from-slate-950 to-transparent">
            <h1 className="text-xl font-bold tracking-tight text-indigo-400">
              Echo<span className="text-slate-100">Visualizer</span>
            </h1>
            <nav className="flex gap-4 text-sm font-medium text-slate-400">
              <span className="hover:text-indigo-400 cursor-pointer transition-colors">Dashboard</span>
              <span className="hover:text-indigo-400 cursor-pointer transition-colors">Analytics</span>
            </nav>
          </header>
          
          <main className="flex-grow">
            {children}
          </main>

          <footer className="fixed bottom-0 w-full p-6 text-center text-xs text-slate-600">
            Real-time sentiment clustering via Vercel AI SDK • 3D Force-Directed Engine
          </footer>
        </div>
      </body>
    </html>
  );
}