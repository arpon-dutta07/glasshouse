"use client";

import React from "react";
import Link from "next/link";
import { Laptop, Smartphone, Tv, Cpu, Wifi, Monitor, Router, Tablet, ArrowRight } from "lucide-react";
import { Device } from "@/lib/api";
import { ScoreGauge } from "./ScoreGauge";

interface DeviceCardProps {
  device: Device;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const getDeviceIcon = (vendor?: string, name?: string) => {
    const text = `${vendor || ""} ${name || ""}`.toLowerCase();
    // Smart TV / Streaming
    if (text.includes("tv") || text.includes("roku") || text.includes("sony") || text.includes("lg electronics") || text.includes("vizio") || text.includes("hisense")) return Tv;
    // Mobile phones
    if (text.includes("phone") || text.includes("iphone") || text.includes("android") || text.includes("samsung") && !text.includes("tv")) return Smartphone;
    if (text.includes("xiaomi") || text.includes("huawei") || text.includes("oneplus") || text.includes("oppo") || text.includes("vivo") || text.includes("realme") || text.includes("motorola")) return Smartphone;
    // Tablets
    if (text.includes("ipad") || text.includes("tablet")) return Tablet;
    // Laptops / Computers
    if (text.includes("apple") || text.includes("mac") || text.includes("laptop")) return Laptop;
    if (text.includes("dell") || text.includes("lenovo") || text.includes("hp ") || text.includes("asus") || text.includes("acer") || text.includes("intel") || text.includes("microsoft") || text.includes("pc")) return Monitor;
    // IoT
    if (text.includes("espressif") || text.includes("iot") || text.includes("raspberry") || text.includes("tuya") || text.includes("sonoff")) return Cpu;
    // Router
    if (text.includes("tp-link") || text.includes("netgear") || text.includes("cisco") || text.includes("ubiquiti") || text.includes("linksys") || text.includes("router")) return Router;
    // Realtek is typically a Wi-Fi chipset
    if (text.includes("realtek") || text.includes("liteon") || text.includes("qualcomm")) return Wifi;
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
      className="group block rounded-xl p-4 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-[13px] text-slate-200 truncate group-hover:text-white transition-colors leading-tight">
                {device.device_name || "Network Device"}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">{device.vendor || "Unknown Vendor"}</p>
            </div>
          </div>

          <div className="space-y-1 text-[11px] font-mono text-slate-500 mt-3">
            <div className="flex justify-between">
              <span>IP</span>
              <span className="text-slate-400">{device.ip_address || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>MAC</span>
              <span className="text-slate-400">{device.mac_address}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px]">
            <span className="text-slate-500">
              {totalCount} conn{totalCount !== 1 ? "s" : ""}
            </span>
            {trackerCount > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-red-400/80">
                  {trackerPercent}% tracking
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Gauge */}
        <div className="flex flex-col items-center pt-1">
          <ScoreGauge score={score} size={68} strokeWidth={5} showLabel={false} />
          <span className="text-[10px] mt-1.5 text-slate-600 flex items-center gap-0.5 group-hover:text-cyan-500 transition-colors">
            Details <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};
