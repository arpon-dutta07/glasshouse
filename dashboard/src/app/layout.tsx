import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { RadarBackground } from "@/components/RadarBackground";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glasshouse — Surveillance Radar & TLS Privacy Observability",
  description: "Passive TLS ClientHello SNI observation, privacy classification, and real-time surveillance network map.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 relative">
        <ThemeProvider>
          <RadarBackground />
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <footer className="py-6 text-center text-[11px] text-slate-500/80 border-t border-white/[0.04]">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-medium text-slate-400">Glasshouse Network Radar Engine</span>
                </div>
                <p className="font-mono text-slate-600">Passive TLS ClientHello SNI Inspection • Zero Traffic Decryption</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
