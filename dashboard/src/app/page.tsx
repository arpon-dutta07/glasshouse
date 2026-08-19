"use client";

import React, { useEffect, useState } from "react";
import { Search, RefreshCw, AlertCircle, ArrowUpRight, Wifi, Sparkles } from "lucide-react";
import { Device, NetworkStats, fetchDevices, fetchStats, scanNetworkDevices } from "@/lib/api";
import { DeviceCard } from "@/components/DeviceCard";
import { LiveFeed } from "@/components/LiveFeed";
import { ScoreGauge } from "@/components/ScoreGauge";
import { DeploymentBanner } from "@/components/DeploymentBanner";

export default function OverviewPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [devs, s] = await Promise.all([fetchDevices(), fetchStats()]);
    setDevices(Array.isArray(devs) ? devs : []);
    setStats(s);
    setLoading(false);
  };

  const handleScanNetwork = async () => {
    setScanning(true);
    setScanMessage("Scanning Wi-Fi subnet for connected devices...");
    const res = await scanNetworkDevices();
    if (res && res.devices && Array.isArray(res.devices)) {
      setDevices(res.devices);
      setScanMessage(`Discovered ${res.devices.length} active device${res.devices.length !== 1 ? "s" : ""} on Wi-Fi!`);
    } else {
      await loadData();
      setScanMessage("Scan complete.");
    }
    setTimeout(() => setScanMessage(null), 4000);
    setScanning(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const deviceList = Array.isArray(devices) ? devices : [];
  const filteredDevices = deviceList.filter((d) => {
    const query = search.toLowerCase();
    return (
      (d.device_name && d.device_name.toLowerCase().includes(query)) ||
      (d.vendor && d.vendor.toLowerCase().includes(query)) ||
      (d.mac_address && d.mac_address.toLowerCase().includes(query)) ||
      (d.ip_address && d.ip_address.includes(query))
    );
  });

  return (
    <div className="space-y-8">
      {/* Onboarding & Deployment Disclaimer Banner */}
      <DeploymentBanner />

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
                size={70}
                strokeWidth={5}
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
            <p className="text-[11px] text-cyan-400/80 mt-1 font-mono">Active on Wi-Fi</p>
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

      {/* Scan notification */}
      {scanMessage && (
        <div className="py-2.5 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{scanMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Section: Devices & Top Trackers (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Devices Header + Search + Scan Button */}
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

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Scan Wi-Fi Button */}
                <button
                  onClick={handleScanNetwork}
                  disabled={scanning}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all disabled:opacity-50"
                  title="Scan local Wi-Fi subnet for all connected devices"
                >
                  <RefreshCw className={`w-3 h-3 ${scanning ? "animate-spin text-cyan-400" : ""}`} />
                  <span>{scanning ? "Scanning..." : "Scan Wi-Fi"}</span>
                </button>

                {/* Minimal Search Input */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.05] transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Devices Grid */}
            {loading && devices.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
                  />
                ))}
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-8 text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No devices match your search</p>
                <p className="text-[11px] text-slate-600">
                  Try clearing the filter or clicking "Scan Wi-Fi".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDevices.map((device) => (
                  <DeviceCard
                    key={device.mac_address}
                    device={device}
                    onRenamed={() => loadData()}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Top Trackers Section */}
          {stats && stats.top_trackers && stats.top_trackers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Top Observed Trackers
              </h3>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] divide-y divide-white/[0.03]">
                {stats.top_trackers.map((tracker, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-slate-600 w-4">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-slate-200 truncate">
                          {tracker.domain || tracker.sni_domain || "Unknown Domain"}
                        </p>
                        <p className="text-[10px] text-slate-500 capitalize">
                          {(tracker.category || tracker.classification || "tracker").replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-mono font-medium text-red-400/90">
                        {tracker.hits}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">hits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Real-time Live Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}
