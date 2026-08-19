"use client";

import React, { useEffect, useState } from "react";
import { Search, RefreshCw, AlertCircle, ArrowUpRight } from "lucide-react";
import { Device, NetworkStats, fetchDevices, fetchStats } from "@/lib/api";
import { DeviceCard } from "@/components/DeviceCard";
import { LiveFeed } from "@/components/LiveFeed";
import { ScoreGauge } from "@/components/ScoreGauge";

export default function OverviewPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    const [devs, s] = await Promise.all([fetchDevices(), fetchStats()]);
    setDevices(devs);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredDevices = devices.filter((d) => {
    const query = search.toLowerCase();
    return (
      (d.device_name && d.device_name.toLowerCase().includes(query)) ||
      (d.vendor && d.vendor.toLowerCase().includes(query)) ||
      d.mac_address.toLowerCase().includes(query) ||
      (d.ip_address && d.ip_address.includes(query))
    );
  });

  return (
    <div className="space-y-10">
      {/* Unified Stats Strip (Linear / Vercel style) */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-white/[0.04]">
          {/* Stat 1: Network Privacy Score */}
          <div className="flex items-center justify-between lg:px-6 first:pl-0">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Network Score
              </p>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-bold tracking-tight text-white animate-count">
                  {stats ? stats.network_average_score : "—"}
                </span>
                <span className="text-xs text-slate-500 font-mono">/100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">Fleet avg rating</p>
            </div>
            <div className="hidden sm:block">
              <ScoreGauge
                score={stats?.network_average_score ?? 100}
                size={56}
                strokeWidth={4.5}
                showLabel={false}
              />
            </div>
          </div>

          {/* Stat 2: Observed Devices */}
          <div className="lg:px-6">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Observed Devices
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-bold tracking-tight text-white animate-count">
                {devices.length}
              </span>
              <span className="text-xs text-slate-500 font-mono">hosts</span>
            </div>
            <p className="text-[11px] text-cyan-400/80 mt-1 font-mono">Active on LAN</p>
          </div>

          {/* Stat 3: Tracker Ratio */}
          <div className="lg:px-6">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Tracker Ratio
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-bold tracking-tight text-white animate-count">
                {stats ? stats.tracker_percentage : "—"}
              </span>
              <span className="text-xs text-slate-500 font-mono">%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">Of all TLS handshakes</p>
          </div>

          {/* Stat 4: Total Connections */}
          <div className="lg:px-6 last:pr-0">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Connections
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-bold tracking-tight text-white animate-count">
                {stats ? stats.total_connections.toLocaleString() : "—"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">Inspected SNIs</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Section: Devices & Top Trackers (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Devices Header + Search */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Network Devices
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time privacy ratings and telemetry breakdown
                </p>
              </div>

              {/* Minimal Search Input */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter devices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.05] transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Devices Grid */}
            {filteredDevices.length === 0 ? (
              <div className="rounded-xl bg-white/[0.015] border border-white/[0.04] p-12 text-center text-slate-500 text-xs font-mono">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Listening for network traffic...</span>
                  </div>
                ) : (
                  <span>No devices observed yet on network interface.</span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredDevices.map((dev) => (
                  <DeviceCard key={dev.mac_address} device={dev} />
                ))}
              </div>
            )}
          </div>

          {/* Top Trackers Section */}
          {stats?.top_trackers && stats.top_trackers.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Top Flagged Domains
                </h3>
                <span className="text-[11px] text-slate-600 font-mono">
                  {stats.top_trackers.length} identified
                </span>
              </div>

              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] divide-y divide-white/[0.04]">
                {stats.top_trackers.slice(0, 5).map((tracker, idx) => (
                  <div
                    key={tracker.sni_domain}
                    className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[10px] text-slate-600 w-4">
                        0{idx + 1}
                      </span>
                      <span className="font-mono text-slate-300 truncate">
                        {tracker.sni_domain}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {tracker.hits} hits
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Live Connection Radar (5 cols) */}
        <div className="lg:col-span-5">
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}
