"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Laptop, ArrowRight, ShieldCheck, Edit2, Check, X, Wifi, Activity } from "lucide-react";
import { Device, NetworkStats, renameDevice } from "@/lib/api";
import { ScoreGauge } from "./ScoreGauge";
import { AnimatedCounter } from "./AnimatedCounter";

interface HostDeviceCardProps {
  device: Device | null;
  stats?: NetworkStats | null;
  onRenamed?: (mac: string, newName: string) => void;
}

export const HostDeviceCard: React.FC<HostDeviceCardProps> = ({ device, stats, onRenamed }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(device?.device_name || "This PC (ARPON)");
  const [displayName, setDisplayName] = useState(device?.device_name || "This PC (ARPON)");

  const handleSaveName = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nameInput.trim() || !device) return;
    const ok = await renameDevice(device.mac_address, nameInput.trim());
    if (ok) {
      setDisplayName(nameInput.trim());
      setIsEditing(false);
      onRenamed?.(device.mac_address, nameInput.trim());
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNameInput(displayName);
    setIsEditing(false);
  };

  // Compute live scores and counts with fallback to stats
  const totalCount =
    (device?.current_total_count && device.current_total_count > 0)
      ? device.current_total_count
      : (stats?.total_connections ?? 0);

  const trackerPercentNum =
    stats?.tracker_percentage ??
    (totalCount > 0 && device?.current_tracker_count
      ? (device.current_tracker_count / totalCount) * 100
      : 0);

  const trackerCount =
    (device?.current_tracker_count && device.current_tracker_count > 0)
      ? device.current_tracker_count
      : (stats?.classification_breakdown
          ? ((stats.classification_breakdown["tracker"] || 0) + (stats.classification_breakdown["ad_network"] || 0))
          : Math.round((trackerPercentNum / 100) * totalCount));

  const score =
    (device?.current_score && device.current_score < 100 && totalCount > 0)
      ? device.current_score
      : (stats?.network_average_score ?? 100);

  const ipAddress = device?.ip_address || "192.168.1.2";
  const macAddress = device?.mac_address || "9c:2f:9d:91:39:cd";
  const vendorName = device?.vendor || "Liteon Technology Corporation";

  return (
    <div className="rounded-2xl radar-panel p-6 lg:p-7 relative font-sans shadow-md border border-slate-300/80 dark:border-white/[0.08]">
      {/* Top Header Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11.5px] font-mono font-bold text-slate-800 dark:text-slate-200 tracking-wider uppercase">
            MONITORED HOST DEVICE • LIVE SNI INSPECTION ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-500/10 text-cyan-900 dark:text-cyan-300 border border-cyan-400 dark:border-cyan-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            INTERFACE: {ipAddress}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-center">
        {/* Left Column: Device Identity & Specs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 flex-shrink-0 shadow-sm">
              <Laptop className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-black/70 border border-cyan-500 text-sm text-slate-900 dark:text-white font-bold focus:outline-none w-full font-mono"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-200"
                    title="Save name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 rounded bg-slate-200 dark:bg-white/[0.05] text-slate-700 dark:text-slate-400"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white font-hud tracking-tight truncate">
                    {displayName}
                  </h2>
                  {device && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-slate-400 hover:text-cyan-600 opacity-80 group-hover/title:opacity-100 transition-opacity"
                      title="Rename device"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {vendorName}
              </p>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block font-mono">
                IP Address
              </span>
              <p className="text-xs font-mono text-cyan-800 dark:text-cyan-300 mt-0.5 font-bold">
                {ipAddress}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block font-mono">
                MAC Address
              </span>
              <p className="text-xs font-mono text-slate-900 dark:text-slate-200 mt-0.5 truncate font-bold">
                {macAddress}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block font-mono">
                Sniffing Mode
              </span>
              <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Zero-Decryption SNI
              </p>
            </div>
          </div>

          {/* View Details Link */}
          <div className="pt-1">
            <Link
              href={`/devices/${encodeURIComponent(macAddress)}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-800 dark:text-cyan-300 hover:text-black dark:hover:text-white font-mono transition-colors group"
            >
              <span>View Deep Telemetry & Connection Logs</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right Column: Speedometer Score Gauge & Quick Metrics (5 cols) */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row items-center justify-around gap-6 p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/[0.04]">
          <div className="flex flex-col items-center justify-center">
            <ScoreGauge score={score} size={135} showLabel={true} />
          </div>

          <div className="space-y-3 font-mono text-xs w-full sm:w-auto">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">
                Total Handshakes
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white font-hud">
                <AnimatedCounter value={totalCount} />
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">
                Telemetry & Ads
              </span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                <AnimatedCounter value={trackerCount} /> queries ({trackerPercentNum.toFixed(1)}%)
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">
                Safety Status
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {score >= 80 ? "Nominal Privacy" : "Exposure Detected"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
