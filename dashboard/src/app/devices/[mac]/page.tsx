"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Laptop,
  Smartphone,
  Tv,
  Cpu,
  Wifi,
  Monitor,
  Router,
  Tablet,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { Device, ConnectionEvent, fetchDeviceDetails, addCustomRule, renameDevice } from "@/lib/api";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CategoryLegend } from "@/components/CategoryLegend";

export default function DeviceDetailPage() {
  const params = useParams();
  const rawMac = params.mac as string;
  const mac = decodeURIComponent(rawMac);

  const [deviceData, setDeviceData] = useState<{
    device: Device;
    score_history: Array<{ computed_at: string; score: number; tracker_count: number; total_count: number }>;
    recent_connections: ConnectionEvent[];
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const loadDetails = async () => {
    if (!mac) return;
    const res = await fetchDeviceDetails(mac);
    setDeviceData(res);
    if (res?.device?.device_name) {
      setNameInput(res.device.device_name);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDetails();
  }, [mac]);

  const handleRuleAction = async (domain: string, action: "allow" | "block") => {
    const ok = await addCustomRule(domain, action, action === "allow" ? "first_party" : "tracker");
    if (ok) {
      setNotification(`Rule applied: ${action.toUpperCase()} for ${domain}`);
      setTimeout(() => setNotification(null), 3000);
      loadDetails();
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    const ok = await renameDevice(mac, nameInput.trim());
    if (ok) {
      setNotification(`Device renamed to: ${nameInput.trim()}`);
      setIsEditing(false);
      setTimeout(() => setNotification(null), 3000);
      loadDetails();
    }
  };

  const getDeviceIcon = (vendor?: string, name?: string) => {
    const text = `${vendor || ""} ${name || ""}`.toLowerCase();
    if (
      text.includes("this pc") ||
      text.includes("host") ||
      text.includes("arpon") ||
      text.includes("laptop") ||
      text.includes("desktop") ||
      text.includes("pc") ||
      text.includes("macbook")
    ) {
      return Laptop;
    }
    if (
      text.includes("dell") ||
      text.includes("lenovo") ||
      text.includes("hp ") ||
      text.includes("asus") ||
      text.includes("intel") ||
      text.includes("microsoft")
    ) {
      return Monitor;
    }
    if (
      text.includes("tv") ||
      text.includes("roku") ||
      text.includes("sony") ||
      text.includes("lg electronics")
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
      text.includes("vivo")
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
      text.includes("router")
    ) {
      return Router;
    }
    if (text.includes("realtek") || text.includes("liteon") || text.includes("qualcomm")) return Laptop;
    return Wifi;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 font-mono text-xs">
        Loading telemetry for {mac}...
      </div>
    );
  }

  if (!deviceData || !deviceData.device) {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-12 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-base font-semibold text-slate-200">Device Not Found</h2>
        <p className="text-xs text-slate-500 font-mono">No telemetry records for MAC: {mac}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-slate-300 text-xs font-medium hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Overview
        </Link>
      </div>
    );
  }

  const { device, score_history, recent_connections } = deviceData;
  const score = device.current_score ?? 100;
  const trackerConns = recent_connections.filter(
    (c) => c.classification === "tracker" || c.classification === "ad_network"
  );
  const uniqueTrackers = Array.from(new Set(trackerConns.map((c) => c.sni_domain)));
  const Icon = getDeviceIcon(device.vendor, device.device_name);

  return (
    <div className="space-y-10">
      {/* Top Breadcrumb & Metadata */}
      <div className="flex items-center justify-between text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Overview
        </Link>
        <span className="font-mono text-slate-500 text-[11px]">
          Last seen {new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {notification && (
        <div className="py-2 px-4 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs text-center font-mono">
          {notification}
        </div>
      )}

      {/* Main Device Hero Banner */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Left Device Summary */}
          <div className="space-y-4 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-400 flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  {device.vendor || "Generic Device"}
                </span>

                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="px-2 py-1 rounded bg-black/60 border border-cyan-500 text-sm text-white font-semibold focus:outline-none max-w-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40"
                      title="Save name"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setNameInput(device.device_name || "");
                        setIsEditing(false);
                      }}
                      className="p-1 rounded bg-white/[0.05] text-slate-400 hover:text-white"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/title">
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight truncate">
                      {device.device_name || "Observed Host"}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-slate-600 hover:text-cyan-400 opacity-0 group-hover/title:opacity-100 transition-opacity"
                      title="Rename device"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <span className="text-[10px] uppercase font-medium text-slate-500">IP Address</span>
                <p className="text-xs font-mono text-slate-300 mt-1">{device.ip_address || "—"}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-slate-500">MAC Address</span>
                <p className="text-xs font-mono text-slate-300 mt-1 truncate">{device.mac_address}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-slate-500">First Observed</span>
                <p className="text-xs font-mono text-slate-300 mt-1">
                  {new Date(device.first_seen).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-slate-500">Trackers Flagged</span>
                <p className="text-xs font-mono text-red-400/90 mt-1">{uniqueTrackers.length} domains</p>
              </div>
            </div>
          </div>

          {/* Right Score Gauge */}
          <div className="flex flex-col items-center justify-center lg:pl-8 lg:border-l lg:border-white/[0.04] self-stretch">
            <ScoreGauge score={score} size={100} strokeWidth={8} />
            <p className="text-[10px] text-slate-500 mt-2 text-center font-mono">Rolling 24h score</p>
          </div>
        </div>
      </div>

      {/* 24-Hour Score History */}
      {score_history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Score Timeline
          </h3>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-12 gap-2 text-center">
              {score_history.slice(-12).map((item, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-white/[0.015] font-mono">
                  <div className="text-sm font-semibold text-white">{item.score}</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {new Date(item.computed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-0.5">
                    {item.tracker_count} trk
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connection Logs Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Recent TLS Handshakes
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-600">{recent_connections.length} records</span>
            <CategoryLegend />
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.04] text-[10px] uppercase font-medium text-slate-500">
                  <th className="py-3 px-4">Domain (SNI)</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] font-mono text-[11px]">
                {recent_connections.map((conn, idx) => {
                  const isMalicious = conn.classification === "malicious";
                  const isTracker =
                    conn.classification === "tracker" || conn.classification === "ad_network";
                  const dotColor = isMalicious
                    ? "bg-rose-500 ring-1 ring-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                    : isTracker
                    ? "bg-red-400"
                    : conn.classification === "first_party"
                    ? "bg-emerald-400"
                    : "bg-slate-500";

                  return (
                    <tr key={conn.id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-200">
                        {conn.sni_domain}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-400 capitalize">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          {(conn.classification || "unknown").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {conn.destination_ip || conn.dst_ip || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(conn.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleRuleAction(conn.sni_domain, "allow")}
                            className="px-2 py-0.5 rounded text-[10px] bg-white/[0.03] hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-500 transition-colors"
                          >
                            Allow
                          </button>
                          <button
                            onClick={() => handleRuleAction(conn.sni_domain, "block")}
                            className="px-2 py-0.5 rounded text-[10px] bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 text-slate-500 transition-colors"
                          >
                            Block
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
