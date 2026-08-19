"use client";

import React, { useEffect, useState } from "react";
import { Device, NetworkStats, fetchDevices, fetchStats } from "@/lib/api";
import { HostDeviceCard } from "@/components/HostDeviceCard";
import { LiveFeed } from "@/components/LiveFeed";
import { ScoreGauge } from "@/components/ScoreGauge";
import { DeploymentBanner } from "@/components/DeploymentBanner";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export default function OverviewPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [devs, s] = await Promise.all([fetchDevices(), fetchStats()]);
      setDevices(Array.isArray(devs) ? devs : []);
      setStats(s);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Main host device (This PC)
  const hostDevice = devices.length > 0 ? devices[0] : null;

  return (
    <div className="space-y-8 font-sans">
      {/* High-Visibility Onboarding Banner with Npcap Download Link */}
      <DeploymentBanner />

      {/* Flagship Hero: Monitored Host Device Summary ("This PC") */}
      <HostDeviceCard
        device={hostDevice}
        onRenamed={loadData}
      />

      {/* Surveillance Stat Strip with Odometer Counter Animations */}
      <div className="rounded-2xl radar-panel p-6 shadow-sm border border-slate-300/80 dark:border-white/[0.08]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-slate-200 dark:md:divide-white/[0.06]">
          {/* Stat 1: Host Privacy Score */}
          <div className="flex items-center justify-between md:px-6 first:pl-0">
            <div>
              <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
                HOST PRIVACY SCORE
              </p>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-hud">
                  <AnimatedCounter value={stats?.network_average_score ?? 100} decimals={1} />
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">/100</span>
              </div>
              <p className="text-[11.5px] text-cyan-800 dark:text-cyan-400 mt-1 font-mono font-bold">
                Rolling 24h average
              </p>
            </div>
            <div className="hidden sm:block">
              <ScoreGauge
                score={stats?.network_average_score ?? 100}
                size={82}
                showLabel={false}
              />
            </div>
          </div>

          {/* Stat 2: Tracker Ratio */}
          <div className="md:px-6">
            <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
              TRACKER RATIO
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-hud">
                <AnimatedCounter value={stats?.tracker_percentage ?? 0} decimals={1} />
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">%</span>
            </div>
            <p className="text-[11.5px] text-rose-800 dark:text-rose-400 mt-1 font-mono font-bold">
              Telemetry & ad queries
            </p>
          </div>

          {/* Stat 3: Total Connections */}
          <div className="md:px-6 last:pr-0">
            <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
              INSPECTED HANDSHAKES
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-hud">
                <AnimatedCounter value={stats?.total_connections ?? 0} />
              </span>
            </div>
            <p className="text-[11.5px] text-slate-700 dark:text-slate-400 mt-1 font-mono font-bold">
              TLS ClientHello SNIs
            </p>
          </div>
        </div>
      </div>

      {/* Main Section: Terminal Live Stream Feed */}
      <div className="space-y-4">
        <LiveFeed />
      </div>
    </div>
  );
}
