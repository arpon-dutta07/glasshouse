"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Device, NetworkStats, ConnectionEvent, fetchDevices, fetchStats } from "@/lib/api";
import { HostDeviceCard } from "@/components/HostDeviceCard";
import { LiveFeed } from "@/components/LiveFeed";
import { ScoreGauge } from "@/components/ScoreGauge";
import { DeploymentBanner } from "@/components/DeploymentBanner";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Shield, Activity, Radio, Lock, ArrowUpRight, Zap } from "lucide-react";

export default function OverviewPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const [devs, s] = await Promise.all([fetchDevices(), fetchStats()]);
      setDevices(Array.isArray(devs) ? devs : []);
      setStats(s);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Main host device (This PC)
  const hostDevice =
    devices.find(
      (d) =>
        d.device_name?.toLowerCase().includes("pc") ||
        d.ip_address === "192.168.1.2" ||
        d.mac_address === "9c:2f:9d:91:39:cd"
    ) || (devices.length > 0 ? devices[0] : null);

  const handleLiveEventsUpdate = (events: ConnectionEvent[]) => {
    if (events.length > 0 && stats) {
      setStats((prev) =>
        prev
          ? {
              ...prev,
              total_connections: Math.max(prev.total_connections, events.length),
            }
          : prev
      );
    }
  };

  const privacyScore = stats?.network_average_score ?? 100;
  const trackerPercentage = stats?.tracker_percentage ?? 0;
  const totalConnections = stats?.total_connections ?? 0;

  return (
    <div className="space-y-10 font-sans">
      {/* Modern Hero Section */}
      <div className="relative pt-2 pb-4 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time TLS Privacy Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight leading-tight">
              Your network, <span className="gradient-text-primary">decoded.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
              Passive, zero-decryption TLS domain inspection for your computer. See every server, tracker, and ad network your apps reach out to in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl glass-card text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>100% Local Processing</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Card 1: Privacy Score */}
          <div className="rounded-3xl glass-card p-6 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-indigo-500/30 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Host Privacy Score
                </p>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
                    <AnimatedCounter value={privacyScore} decimals={1} />
                  </span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/ 100</span>
                </div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1.5 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Rolling 24-hour weighted average
                </p>
              </div>
              <div className="hidden sm:block">
                <ScoreGauge score={privacyScore} size={88} showLabel={false} />
              </div>
            </div>
          </div>

          {/* Card 2: Tracker Ratio */}
          <div className="rounded-3xl glass-card p-6 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-amber-500/30 group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tracker & Ad Ratio
              </p>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
                  <AnimatedCounter value={trackerPercentage} decimals={1} />
                </span>
                <span className="text-base font-semibold text-slate-500 dark:text-slate-400">%</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1.5">
                Proportion of non-first-party telemetry queries
              </p>
            </div>

            {/* Subtle Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-white/[0.08] h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, trackerPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Total Handshakes */}
          <div className="rounded-3xl glass-card p-6 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-purple-500/30 group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Inspected Handshakes
              </p>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
                  <AnimatedCounter value={totalConnections} />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                TLS ClientHello SNI records parsed
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Live Packet Capture Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment & Setup Callout */}
      <DeploymentBanner />

      {/* Flagship Monitored Host Device ("This PC") */}
      <HostDeviceCard
        device={hostDevice}
        stats={stats}
        onRenamed={loadData}
      />

      {/* Main Section: Modern Live Feed */}
      <div className="space-y-4">
        <LiveFeed onEventsUpdate={handleLiveEventsUpdate} />
      </div>
    </div>
  );
}
