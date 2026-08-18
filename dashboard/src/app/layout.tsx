import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glasshouse — TLS Privacy Observability & Network Radar",
  description: "Passive TLS ClientHello SNI observation, privacy classification, and per-device scoring engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>Glasshouse Privacy Observability System • Passive SNI Inspection Only</p>
            <p className="font-mono text-[11px] text-slate-400">No Decryption • Zero Payload Interception</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
