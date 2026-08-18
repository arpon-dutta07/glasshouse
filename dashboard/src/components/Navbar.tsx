"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Radio, Server, Sliders, Activity } from "lucide-react";
import { createLiveWebSocket } from "@/lib/api";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = createLiveWebSocket(
        () => {},
        (status) => setWsConnected(status)
      );
    } catch {
      setWsConnected(false);
    }

    return () => {
      ws?.close();
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Overview", icon: Activity },
    { href: "/rules", label: "Custom Rules", icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-cyan-200 to-emerald-400">
                GLASSHOUSE
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 uppercase">
                SNI Observer
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Passive TLS Network Privacy Radar</p>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 rounded-full px-2 py-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              {wsConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  wsConnected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              ></span>
            </span>
            <span className={`font-mono text-[11px] ${wsConnected ? "text-emerald-400" : "text-rose-400"}`}>
              {wsConnected ? "LIVE CAPTURE" : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
