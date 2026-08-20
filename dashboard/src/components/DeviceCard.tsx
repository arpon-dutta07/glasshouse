"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Laptop, Smartphone, Tv, Cpu, Wifi, Monitor, Router, Tablet, ArrowRight, Edit2, Check, X, Trash2 } from "lucide-react";
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
  const isOnline = device.is_online !== false;

  return (
    <Link
      href={`/devices/${encodeURIComponent(device.mac_address)}`}
      className="group relative block rounded-3xl p-5 glass-card radar-panel-hover font-sans"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-all flex-shrink-0">
              <Icon className="w-5 h-5" />
              {isOnline && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#10131e]"
                  title="Online"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-black/70 border border-indigo-500 text-xs text-slate-900 dark:text-white font-bold focus:outline-none w-full"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1.5 rounded-lg bg-indigo-600 text-white"
                    title="Save name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-heading leading-snug">
                    {displayName}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover/name:opacity-100 transition-opacity rounded"
                    title="Rename device"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleDeleteDevice}
                    className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover/name:opacity-100 transition-opacity rounded"
                    title="Forget device"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {device.vendor || "Generic Device"}
                </span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isOnline
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                      : "bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="flex justify-between">
              <span>IP</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{device.ip_address || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>MAC</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate">{device.mac_address}</span>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {totalCount} handshake{totalCount !== 1 ? "s" : ""}
              </span>
              {trackerCount > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{trackerPercent}% tracking</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Score */}
        <div className="flex flex-col items-center justify-center pt-1 min-w-[80px]">
          {totalCount > 0 ? (
            <>
              <ScoreGauge score={score} size={82} showLabel={false} />
              <span className="text-xs font-bold mt-1 text-slate-600 dark:text-slate-400 flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Score {score} <ArrowRight className="w-3 h-3" />
              </span>
            </>
          ) : (
            <div className="text-center py-2 px-1">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-1 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-all">
                <Wifi className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-center gap-1">
                Details <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
