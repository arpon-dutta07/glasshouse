"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Sliders, Shield, Sun, Moon, Volume2, VolumeX, Radio } from "lucide-react";
import { createLiveWebSocket } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [wsConnected, setWsConnected] = useState(false);
  const { theme, toggleTheme, soundEnabled, toggleSound } = useTheme();

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
    { href: "/", label: "Radar Overview", icon: Activity },
    { href: "/blocked", label: "Blocked Domains", icon: Shield },
    { href: "/rules", label: "Custom Rules", icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-[#080b10]/85 border-b border-slate-200 dark:border-white/[0.06] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-white transition-colors flex items-center gap-1.5 font-hud">
              GLASSHOUSE
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                RADAR
              </span>
            </span>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.02] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.04]">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-sm dark:shadow-[0_0_10px_rgba(6,182,212,0.15)] font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-white/[0.03]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action Controls: Audio Alert, Theme Toggle, Live Status */}
        <div className="flex items-center gap-3">
          {/* Sound Alert Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-mono font-medium ${
              soundEnabled
                ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/40 shadow-sm"
                : "bg-slate-100 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.06] hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/[0.06]"
            }`}
            title={soundEnabled ? "Live Alert Sound: ON (Click to mute)" : "Live Alert Sound: OFF (Click to enable)"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline text-[11px]">{soundEnabled ? "Audio On" : "Muted"}</span>
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200/60 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
          </button>

          {/* Live WS Status Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/[0.06]">
            <span className="relative flex h-2 w-2">
              {wsConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  wsConnected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              ></span>
            </span>
            <span className={`text-[11px] font-mono font-bold ${wsConnected ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
              {wsConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
