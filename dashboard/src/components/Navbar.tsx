"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Sliders } from "lucide-react";
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
    { href: "/rules", label: "Rules", icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#06060b]/80 border-b border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <span className="text-cyan-400 text-sm font-bold">G</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-slate-200 group-hover:text-white transition-colors">
            Glasshouse
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.04] text-slate-500">
            v1.0
          </span>
        </Link>

        {/* Center Nav */}
        <nav className="flex items-center gap-0.5">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {wsConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                wsConnected ? "bg-emerald-400" : "bg-slate-600"
              }`}
            ></span>
          </span>
          <span className={`text-[11px] font-mono ${wsConnected ? "text-emerald-400/80" : "text-slate-600"}`}>
            {wsConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
};
