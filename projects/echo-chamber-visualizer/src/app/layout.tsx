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
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500/30`}>
        <div className="relative min-h-screen flex flex-col">
          <header className="fixed top-0 w-full z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
            <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                ECHO CHAMBER
              </div>
              <div className="flex gap-6 text-sm font-medium text-zinc-400">
                <a href="#" className="hover:text-indigo-400 transition-colors">Dashboard</a>
                <a href="#" className="hover:text-indigo-400 transition-colors">Methodology</a>
              </div>
            </nav>
          </header>

          <main className="flex-grow pt-16">
            {children}
          </main>

          <footer className="py-8 text-center text-zinc-600 text-xs border-t border-zinc-900">
            © {new Date().getFullYear()} Echo Chamber Visualizer • Real-time Sentiment Analytics
          </footer>
        </div>
      </body>
    </html>
  );
}