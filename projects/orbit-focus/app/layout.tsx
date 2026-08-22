import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Orbit Focus",
  description: "Visualize your productivity in a stable gravity field.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased min-h-screen selection:bg-indigo-500/30`}>
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10" />
        <main className="relative flex flex-col min-h-screen">
          <header className="p-6 flex justify-between items-center z-10">
            <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Orbit Focus
            </h1>
            <nav className="flex gap-4 text-sm font-medium text-slate-400">
              <button className="hover:text-indigo-400 transition-colors">Dashboard</button>
              <button className="hover:text-indigo-400 transition-colors">Settings</button>
            </nav>
          </header>
          <div className="flex-grow">
            {children}
          </div>
          <footer className="p-6 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} Orbit Focus — Local-first productivity
          </footer>
        </main>
      </body>
    </html>
  );
}