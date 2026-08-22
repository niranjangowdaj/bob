import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Echo Chamber Visualizer",
  description: "Map your social media feed to detect cognitive bias and bubble entrapment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className={`${inter.className} h-full bg-slate-950 text-slate-50 antialiased selection:bg-indigo-500/30`}>
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20" />
                <span className="text-lg font-bold tracking-tight">EchoVisualizer</span>
              </div>
              <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
                <a href="/" className="transition-colors hover:text-white">Dashboard</a>
                <a href="#about" className="transition-colors hover:text-white">Methodology</a>
                <a href="/privacy" className="transition-colors hover:text-white">Privacy</a>
              </div>
            </nav>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Echo Chamber Visualizer. Local WASM processing for your privacy.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}