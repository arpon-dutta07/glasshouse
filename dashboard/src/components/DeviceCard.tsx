"use client";

import React from "react";
import Link from "next/link";
import { Laptop, Smartphone, Tv, Cpu, HelpCircle, ArrowUpRight, Wifi } from "lucide-react";
import { Device } from "@/lib/api";
import { ScoreGauge } from "./ScoreGauge";

interface DeviceCardProps {
  device: Device;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const getDeviceIcon = (vendor?: string, name?: string) => {
    const text = `${vendor || ""} ${name || ""}`.toLowerCase();
    if (text.includes("apple") || text.includes("mac") || text.includes("laptop")) return Laptop;
    if (text.includes("phone") || text.includes("samsung") || text.includes("xiaomi")) return Smartphone;
    if (text.includes("tv") || text.includes("roku") || text.includes("sony") || text.includes("lg")) return Tv;
    if (text.includes("espressif") || text.includes("iot") || text.includes("raspberry")) return Cpu;
    return Wifi;
  };

  const Icon = getDeviceIcon(device.vendor, device.device_name);
  const score = device.current_score ?? 100;
  const trackerCount = device.current_tracker_count ?? 0;
  const totalCount = device.current_total_count ?? 0;
  const trackerPercent = totalCount > 0 ? Math.round((trackerCount / totalCount) * 100) : 0;

  return (
    <Link
      href={`/devices/${encodeURIComponent(device.mac_address)}`}
      className="glass-card glass-card-hover rounded-2xl p-5 block group relative overflow-hidden"
    >
      {/* Decorative gradient glow top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-4">
        {/* Left info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 transition-colors">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm truncate group-hover:text-cyan-300 transition-colors">
                {device.device_name || "Network Device"}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">{device.vendor || "Unknown Vendor"}</p>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400 bg-slate-950/40 px-2 py-1 rounded">
              <span className="text-[10px] uppercase text-slate-400">IP:</span>
              <span className="text-slate-200">{device.ip_address || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 bg-slate-950/40 px-2 py-1 rounded">
              <span className="text-[10px] uppercase text-slate-400">MAC:</span>
              <span className="text-slate-300">{device.mac_address}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {totalCount} requests
            </span>
            {trackerCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/50 text-rose-300 font-medium">
                {trackerPercent}% tracking
              </span>
            )}
          </div>
        </div>

        {/* Right Gauge */}
        <div className="flex flex-col items-center">
          <ScoreGauge score={score} size={84} strokeWidth={7} showLabel={false} />
          <span className="text-[10px] font-mono mt-1 text-slate-400 flex items-center gap-0.5 group-hover:text-cyan-400 transition-colors">
            View Details <ArrowUpRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};
