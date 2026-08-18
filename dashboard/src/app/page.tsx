"use client";

import React, { useEffect, useState } from "react";
import { Shield, ShieldAlert, Cpu, Activity, Search, RefreshCw, AlertTriangle } from "lucide-react";
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
    <div className="space-y-8">
      {/* Top Banner / Ticker */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Score */}
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Network Privacy Score</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {stats ? `${stats.network_average_score}/100` : "—"}
            </h3>
            <p className="text-[11px] text-emerald-400 mt-1 font-mono">LAN Fleet Average</p>
          </div>
          <ScoreGauge score={stats?.network_average_score ?? 100} size={70} strokeWidth={6} showLabel={false} />
        </div>

        {/* Metric 2: Active Devices */}
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observed Devices</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">{devices.length}</h3>
            <p className="text-[11px] text-cyan-400 mt-1 font-mono">LAN Hosts Tracked</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Tracker Percentage */}
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tracker Ratio</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {stats ? `${stats.tracker_percentage}%` : "—"}
            </h3>
            <p className="text-[11px] text-rose-400 mt-1 font-mono">Of all TLS handshakes</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Total Connections */}
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Connections</p>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">
              {stats ? stats.total_connections.toLocaleString() : "—"}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">TLS Handshakes</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-300">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Devices List (Left 7 cols) & Live Radar (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Device Directory */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Active LAN Devices</h2>
              <p className="text-xs text-slate-400">Per-device privacy rating and tracker breakdown</p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search device, IP, MAC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Device Cards Grid */}
          {filteredDevices.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center text-slate-400 text-xs font-mono">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Scanning network devices...</span>
                </div>
              ) : (
                <span>No matching devices observed yet on local network.</span>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDevices.map((dev) => (
                <DeviceCard key={dev.mac_address} device={dev} />
              ))}
            </div>
          )}

          {/* Top Tracker Domains Widget */}
          {stats?.top_trackers && stats.top_trackers.length > 0 && (
            <div className="glass-card rounded-2xl p-5 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Top Detected Trackers & Ad Networks
                </h3>
              </div>
              <div className="space-y-2">
                {stats.top_trackers.slice(0, 5).map((tracker, idx) => (
                  <div
                    key={tracker.sni_domain}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-400 text-[10px]">#{idx + 1}</span>
                      <span className="font-mono text-slate-300 truncate">{tracker.sni_domain}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 text-rose-300 border border-rose-800/40">
                        {tracker.hits} hits
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Connection Radar */}
        <div className="lg:col-span-5">
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}
