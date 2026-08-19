"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Laptop, Smartphone, Tv, Cpu, Wifi, Monitor, Router, Tablet, ArrowRight, Edit2, Check, X, Trash2, ShieldCheck, Activity } from "lucide-react";
import { Device, renameDevice, deleteDevice } from "@/lib/api";
import { ScoreGauge } from "./ScoreGauge";

interface DeviceCardProps {
  device: Device;
  onRenamed?: (mac: string, newName: string) => void;
  onDeleted?: (mac: string) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onRenamed, onDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(device.device_name || "Network Device");
  const [displayName, setDisplayName] = useState(device.device_name || "Network Device");

  const getDeviceIcon = (vendor?: string, name?: string) => {
    const text = `${vendor || ""} ${name || ""}`.toLowerCase();
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
    if (text.includes("ipad") || text.includes("tablet")) return Tablet;
    if (
      text.includes("espressif") ||
      text.includes("iot") ||
      text.includes("raspberry") ||
      text.includes("tuya") ||
      text.includes("sonoff")
    ) {
      return Cpu;
    }
    if (
      text.includes("tp-link") ||
      text.includes("netgear") ||
      text.includes("cisco") ||
      text.includes("ubiquiti") ||
      text.includes("linksys") ||
      text.includes("router") ||
      text.includes("gateway")
    ) {
      return Router;
    }
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

  const handleDeleteDevice = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Remove device "${displayName}" (${device.mac_address}) from monitoring?`)) {
      const ok = await deleteDevice(device.mac_address);
      if (ok) {
        onDeleted?.(device.mac_address);
      }
    }
  };

  const Icon = getDeviceIcon(device.vendor, displayName);
  const score = device.current_score ?? 100;
  const trackerCount = device.current_tracker_count ?? 0;
  const totalCount = device.current_total_count ?? 0;
  const trackerPercent = totalCount > 0 ? Math.round((trackerCount / totalCount) * 100) : 0;
  const isHost = displayName.toLowerCase().includes("pc") || device.ip_address === "192.168.1.2";

  return (
    <Link
      href={`/devices/${encodeURIComponent(device.mac_address)}`}
      className="group relative block rounded-2xl p-4 radar-panel radar-panel-hover"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all flex-shrink-0">
              <Icon className="w-4 h-4" />
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090c12] animate-pulse"
                title="Active on Wi-Fi"
              />
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
                    className="px-2 py-0.5 rounded bg-black/70 border border-cyan-500 text-xs text-white font-semibold focus:outline-none w-full font-mono"
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
                  <h3 className="font-semibold text-[13px] text-slate-100 truncate group-hover:text-cyan-300 transition-colors leading-tight">
                    {displayName}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="p-0.5 text-slate-500 hover:text-cyan-400 opacity-0 group-hover/name:opacity-100 transition-opacity"
                    title="Rename device"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleDeleteDevice}
                    className="p-0.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover/name:opacity-100 transition-opacity"
                    title="Forget device"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-400 truncate">
                  {device.vendor || "Generic Device"}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] font-mono text-emerald-400/90 font-medium">
                  {isHost ? "SNI Sniffing" : "Connected"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1 text-[11px] font-mono text-slate-400 mt-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">IP</span>
              <span className="text-slate-200">{device.ip_address || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MAC</span>
              <span className="text-slate-200 truncate">{device.mac_address}</span>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-400">
                {totalCount} handshake{totalCount !== 1 ? "s" : ""}
              </span>
              {trackerCount > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-rose-400 font-medium">{trackerPercent}% tracking</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Gauge or Wi-Fi Link Profile */}
        <div className="flex flex-col items-center justify-center pt-1 min-w-[80px]">
          {totalCount > 0 ? (
            <>
              <ScoreGauge score={score} size={76} showLabel={false} />
              <span className="text-[10px] font-mono mt-1 text-slate-400 flex items-center gap-0.5 group-hover:text-cyan-300 transition-colors">
                Score {score} <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </>
          ) : (
            <div className="text-center py-2 px-1">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-1 text-cyan-400 group-hover:border-cyan-500/40 transition-all">
                <Wifi className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-cyan-300 transition-colors flex items-center justify-center gap-0.5">
                Profile <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
