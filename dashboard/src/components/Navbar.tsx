"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Sliders, Shield, Sun, Moon, Volume2, VolumeX, Radio, Sparkles } from "lucide-react";
import { createLiveWebSocket } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [wsConnected, setWsConnected] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      ws?.close();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Overview", icon: Activity },
    { href: "/blocked", label: "Blocked Domains", icon: Shield },
    { href: "/rules", label: "Custom Rules", icon: Sliders },
  ];

  return (
    <header className="fixed top-3 sm:top-4 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none transition-all duration-300">
      <div
        className={`max-w-4xl mx-auto h-14 px-3.5 sm:px-5 flex items-center justify-between rounded-full pointer-events-auto transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 dark:bg-[#0c0e17]/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.1] shadow-xl shadow-black/[0.05] dark:shadow-black/40"
            : "bg-white/80 dark:bg-[#10131e]/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.07] shadow-lg shadow-black/[0.03] dark:shadow-black/20"
        }`}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              Glasshouse
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1 bg-slate-100/70 dark:bg-white/[0.03] p-1 rounded-full border border-slate-200/60 dark:border-white/[0.04]">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white dark:bg-white/[0.1] text-indigo-600 dark:text-white shadow-sm border border-slate-200/70 dark:border-white/[0.08]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.03]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sound Alert Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-full transition-all flex items-center gap-1 text-xs font-medium ${
              soundEnabled
                ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
            title={soundEnabled ? "Live Sound: ON" : "Live Sound: OFF"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Live WS Status Pill */}
          <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-white/[0.06]">
            <span className="relative flex h-2 w-2">
              {wsConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  wsConnected ? "bg-emerald-500" : "bg-rose-500"
                }`}
              ></span>
            </span>
            <span className="text-[11px] font-bold tracking-tight text-slate-600 dark:text-slate-400 hidden sm:inline">
              {wsConnected ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
