"use client";

import React, { useEffect, useState } from "react";
import { Search, RefreshCw, AlertCircle, ArrowUpRight, Wifi, Sparkles, Shield, Radio, Activity } from "lucide-react";
import { Device, NetworkStats, ConnectionEvent, fetchDevices, fetchStats, scanNetworkDevices } from "@/lib/api";
import { DeviceCard } from "@/components/DeviceCard";
import { LiveFeed } from "@/components/LiveFeed";
import { ScoreGauge } from "@/components/ScoreGauge";
import { DeploymentBanner } from "@/components/DeploymentBanner";
import { NetworkRadarMap } from "@/components/NetworkRadarMap";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export default function OverviewPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<ConnectionEvent[]>([]);
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
    setScanMessage("Sweeping Wi-Fi subnet for connected devices...");
    const res = await scanNetworkDevices();
    if (res && res.devices && Array.isArray(res.devices)) {
      setDevices(res.devices);
      setScanMessage(`Discovered ${res.devices.length} active device${res.devices.length !== 1 ? "s" : ""} on Wi-Fi!`);
    } else {
      await loadData();
      setScanMessage("Wi-Fi network scan complete.");
    }
    setTimeout(() => setScanMessage(null), 4000);
    setScanning(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const rawList = Array.isArray(devices) ? devices : [];
  const uniqueMap = new Map<string, Device>();
  rawList.forEach((d) => {
    if (d && d.mac_address) {
      uniqueMap.set(d.mac_address.toLowerCase().trim(), d);
    }
  });
  const deviceList = Array.from(uniqueMap.values());
  const onlineCount = deviceList.filter((d) => d.is_online !== false).length;

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
      {/* High-Visibility Onboarding Banner with Npcap Download */}
      <DeploymentBanner />

      {/* Flagship Hero: Network Surveillance Radar Map */}
      <NetworkRadarMap
        devices={deviceList}
        recentEvents={recentEvents}
      />

      {/* Surveillance Stat Strip with Odometer Number Counter */}
      <div className="rounded-2xl radar-panel p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-slate-200 dark:lg:divide-white/[0.06]">
          {/* Stat 1: Network Privacy Score */}
          <div className="flex items-center justify-between lg:px-6 first:pl-0">
            <div>
              <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
                FLEET PRIVACY SCORE
              </p>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-hud">
                  <AnimatedCounter value={stats?.network_average_score ?? 100} decimals={1} />
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">/100</span>
              </div>
              <p className="text-[11.5px] text-cyan-800 dark:text-cyan-400 mt-1 font-mono font-bold">Rolling 24h average</p>
            </div>
            <div className="hidden sm:block">
              <ScoreGauge
                score={stats?.network_average_score ?? 100}
                size={86}
                showLabel={false}
              />
            </div>
          </div>

          {/* Stat 2: Observed Devices */}
          <div className="lg:px-6">
            <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
              OBSERVED DEVICES
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-hud">
                <AnimatedCounter value={devices.length} />
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">hosts</span>
            </div>
            <p className="text-[11.5px] text-emerald-800 dark:text-emerald-400 mt-1 font-mono font-bold">
              {onlineCount} active on Wi-Fi
            </p>
          </div>

          {/* Stat 3: Tracker Ratio */}
          <div className="lg:px-6">
            <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
              TRACKER RATIO
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-hud">
                <AnimatedCounter value={stats?.tracker_percentage ?? 0} decimals={1} />
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">%</span>
            </div>
            <p className="text-[11.5px] text-rose-800 dark:text-rose-400 mt-1 font-mono font-bold">Telemetry & ad queries</p>
          </div>

          {/* Stat 4: Total Connections */}
          <div className="lg:px-6 last:pr-0">
            <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-400 uppercase tracking-widest">
              INSPECTED HANDSHAKES
            </p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-hud">
                <AnimatedCounter value={stats?.total_connections ?? 0} />
              </span>
            </div>
            <p className="text-[11.5px] text-slate-700 dark:text-slate-400 mt-1 font-mono font-bold">TLS ClientHello SNIs</p>
          </div>
        </div>
      </div>

      {/* Scan notification */}
      {scanMessage && (
        <div className="py-2.5 px-4 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-950 dark:text-cyan-300 text-xs font-mono font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
            <span>{scanMessage}</span>
          </div>
        </div>
      )}

      {/* Main Dual Grid: Left Devices, Right Terminal Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Section: Network Devices Fleet (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wider uppercase font-hud flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                Network Device Fleet
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Connected LAN hardware & telemetry presence
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleScanNetwork}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.08] hover:bg-cyan-50 dark:hover:bg-cyan-500/15 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-cyan-800 dark:hover:text-cyan-300 transition-all disabled:opacity-50 shadow-sm"
                title="Sweep local Wi-Fi subnet for all connected devices"
              >
                <RefreshCw className={`w-3 h-3 ${scanning ? "animate-spin text-cyan-600" : ""}`} />
                <span>{scanning ? "Sweeping..." : "Scan Wi-Fi"}</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by device name, IP, MAC, or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-[#090d16]/80 border border-slate-300 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-cyan-600 font-mono placeholder:text-slate-500 shadow-sm"
            />
          </div>

          {/* Device Cards List */}
          {loading && devices.length === 0 ? (
            <div className="py-20 text-center text-slate-600 font-mono text-xs font-bold">
              Loading active Wi-Fi devices...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="rounded-2xl radar-panel p-8 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">No matching devices found</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">Try searching by IP or MAC address</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredDevices.map((dev) => (
                <DeviceCard
                  key={dev.mac_address}
                  device={dev}
                  onRenamed={loadData}
                  onDeleted={loadData}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Section: Terminal Live Stream (7 cols) */}
        <div className="lg:col-span-7">
          <LiveFeed onEventsUpdate={(evs) => setRecentEvents(evs)} />
        </div>
      </div>
    </div>
  );
}
