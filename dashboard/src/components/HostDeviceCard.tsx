"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Laptop, ArrowRight, ShieldCheck, Edit2, Check, X, Wifi, Activity, Cpu, Sparkles } from "lucide-react";
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
  const [nameInput, setNameInput] = useState(device?.device_name || "This PC (Host)");
  const [displayName, setDisplayName] = useState(device?.device_name || "This PC (Host)");

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
    <div className="rounded-3xl glass-card p-6 sm:p-8 relative transition-all duration-300">
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Local Host Device • Continuous SNI Stream
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.06]">
            Interface IP: <span className="font-mono font-semibold text-slate-900 dark:text-white">{ipAddress}</span>
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
        {/* Left Column: Device Identity & Specs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/15 to-purple-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-sm">
              <Laptop className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/60 border border-indigo-500 text-base text-slate-900 dark:text-white font-bold focus:outline-none w-full max-w-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    title="Save name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 group/title">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight truncate">
                    {displayName}
                  </h2>
                  {device && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-60 group-hover/title:opacity-100 transition-opacity rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                      title="Rename device"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {vendorName}
              </p>
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                IP Address
              </span>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1">
                {ipAddress}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                MAC Address
              </span>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1 truncate">
                {macAddress}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.05]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                Inspection Mode
              </span>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Zero-Decryption
              </p>
            </div>
          </div>

          {/* Deep Details Action */}
          <div className="pt-2">
            <Link
              href={`/devices/${encodeURIComponent(macAddress)}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
            >
              <span>View Connection Logs & Telemetry History</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right Column: Score Gauge & Metrics Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-50/80 dark:bg-black/20 border border-slate-200/80 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-around gap-6">
          <div className="flex flex-col items-center justify-center">
            <ScoreGauge score={score} size={150} showLabel={true} />
          </div>

          <div className="space-y-4 text-sm w-full sm:w-auto">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Total Handshakes
              </span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white font-heading">
                <AnimatedCounter value={totalCount} />
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Tracker & Ad Calls
              </span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                <AnimatedCounter value={trackerCount} /> ({trackerPercentNum.toFixed(1)}%)
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Status
              </span>
              <span className={`text-sm font-semibold flex items-center gap-1.5 mt-0.5 ${
                score >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : score >= 50
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
              }`}>
                <ShieldCheck className="w-4 h-4" />
                {score >= 80 ? "Optimal Privacy" : score >= 50 ? "Elevated Risk" : "High Risk"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
