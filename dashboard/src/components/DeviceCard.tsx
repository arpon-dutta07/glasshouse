"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Laptop, Smartphone, Tv, Cpu, Wifi, Monitor, Router, Tablet, ArrowRight, Edit2, Check, X } from "lucide-react";
import { Device, renameDevice } from "@/lib/api";
import { ScoreGauge } from "./ScoreGauge";

interface DeviceCardProps {
  device: Device;
  onRenamed?: (mac: string, newName: string) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onRenamed }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(device.device_name || "Network Device");
  const [displayName, setDisplayName] = useState(device.device_name || "Network Device");

  const getDeviceIcon = (vendor?: string, name?: string) => {
    const text = `${vendor || ""} ${name || ""}`.toLowerCase();
    // Host PC / Laptops / Computers
    if (
      text.includes("this pc") ||
      text.includes("host") ||
      text.includes("arpon") ||
      text.includes("laptop") ||
      text.includes("desktop") ||
      text.includes("macbook") ||
      text.includes("pc")
    ) {
      return Laptop;
    }
    if (
      text.includes("dell") ||
      text.includes("lenovo") ||
      text.includes("hp ") ||
      text.includes("asus") ||
      text.includes("acer") ||
      text.includes("intel") ||
      text.includes("microsoft")
    ) {
      return Monitor;
    }
    // Smart TV / Streaming
    if (
      text.includes("tv") ||
      text.includes("roku") ||
      text.includes("sony") ||
      text.includes("lg electronics") ||
      text.includes("vizio") ||
      text.includes("hisense")
    ) {
      return Tv;
    }
    // Mobile phones
    if (
      text.includes("phone") ||
      text.includes("iphone") ||
      (text.includes("samsung") && !text.includes("tv")) ||
      text.includes("xiaomi") ||
      text.includes("huawei") ||
      text.includes("oneplus") ||
      text.includes("oppo") ||
      text.includes("vivo") ||
      text.includes("realme") ||
      text.includes("motorola")
    ) {
      return Smartphone;
    }
    // Tablets
    if (text.includes("ipad") || text.includes("tablet")) return Tablet;
    // IoT
    if (
      text.includes("espressif") ||
      text.includes("iot") ||
      text.includes("raspberry") ||
      text.includes("tuya") ||
      text.includes("sonoff")
    ) {
      return Cpu;
    }
    // Router
    if (
      text.includes("tp-link") ||
      text.includes("netgear") ||
      text.includes("cisco") ||
      text.includes("ubiquiti") ||
      text.includes("linksys") ||
      text.includes("router")
    ) {
      return Router;
    }
    // Chipset / Network Card fallback
    if (text.includes("realtek") || text.includes("liteon") || text.includes("qualcomm")) return Laptop;
    return Wifi;
  };

  const handleSaveName = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nameInput.trim()) return;
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

  const Icon = getDeviceIcon(device.vendor, displayName);
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
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors flex-shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-1.5 py-0.5 rounded bg-black/60 border border-cyan-500 text-xs text-white font-medium focus:outline-none w-full"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40"
                    title="Save name"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 rounded bg-white/[0.05] text-slate-400 hover:text-white"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/name">
                  <h3 className="font-medium text-[13px] text-slate-200 truncate group-hover:text-white transition-colors leading-tight">
                    {displayName}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="p-0.5 text-slate-600 hover:text-cyan-400 opacity-0 group-hover/name:opacity-100 transition-opacity"
                    title="Rename device"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {device.vendor || "Unknown Vendor"}
              </p>
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
                <span className="text-red-400/80">{trackerPercent}% tracking</span>
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
