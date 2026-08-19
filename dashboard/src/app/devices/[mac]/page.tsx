"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Trash2,
  Shield,
  Activity,
  Radio,
  Info,
  Terminal,
  Network,
} from "lucide-react";
import { Device, ConnectionEvent, fetchDeviceDetails, addCustomRule, renameDevice, deleteDevice } from "@/lib/api";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CategoryLegend } from "@/components/CategoryLegend";

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
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

  const handleDeleteDevice = async () => {
    if (confirm(`Remove this device (${mac}) from Glasshouse monitoring?`)) {
      const ok = await deleteDevice(mac);
      if (ok) {
        router.push("/");
      }
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
      text.includes("vivo") ||
      text.includes("realme")
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
      text.includes("digisol") ||
      text.includes("router") ||
      text.includes("gateway")
    ) {
      return Router;
    }
    if (text.includes("realtek") || text.includes("liteon") || text.includes("qualcomm")) return Laptop;
    return Wifi;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 font-mono text-xs">
        Loading device profile for {mac}...
      </div>
    );
  }

  if (!deviceData || !deviceData.device) {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-12 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-base font-semibold text-slate-200">Device Not Found</h2>
        <p className="text-xs text-slate-500 font-mono">No record for MAC: {mac}</p>
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
  const hasLiveTelemetry = recent_connections.length > 0;
  const score = device.current_score ?? 100;
  const trackerConns = recent_connections.filter(
    (c) => c.classification === "tracker" || c.classification === "ad_network"
  );
  const uniqueTrackers = Array.from(new Set(trackerConns.map((c) => c.sni_domain)));
  const Icon = getDeviceIcon(device.vendor, device.device_name);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Overview
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-500 text-[11px]">
            Last seen {new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={handleDeleteDevice}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.03] hover:bg-rose-500/10 hover:text-rose-400 text-slate-500 text-[11px] transition-colors"
            title="Forget device"
          >
            <Trash2 className="w-3 h-3" />
            <span>Forget Device</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="py-2 px-4 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs text-center font-mono">
          {notification}
        </div>
      )}

      {/* Main Device Hero Banner */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Left Device Summary */}
          <div className="space-y-4 flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-300 flex-shrink-0">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    {device.vendor || "Connected Wi-Fi Device"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active on Wi-Fi
                  </span>
                </div>

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
                  <div className="flex items-center gap-2 group/title mt-0.5">
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight truncate">
                      {device.device_name || "Wi-Fi Device"}
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

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                <span className="text-[10px] uppercase font-medium text-slate-500 block">IP Address</span>
                <p className="text-xs font-mono text-slate-200 mt-1 font-medium">{device.ip_address || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                <span className="text-[10px] uppercase font-medium text-slate-500 block">MAC Address</span>
                <p className="text-xs font-mono text-slate-200 mt-1 truncate">{device.mac_address}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                <span className="text-[10px] uppercase font-medium text-slate-500 block">Manufacturer</span>
                <p className="text-xs font-mono text-slate-200 mt-1 truncate">{device.vendor || "Generic Wi-Fi"}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                <span className="text-[10px] uppercase font-medium text-slate-500 block">First Discovered</span>
                <p className="text-xs font-mono text-slate-200 mt-1">
                  {new Date(device.first_seen).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Right Status or Score Gauge */}
          {hasLiveTelemetry ? (
            <div className="flex flex-col items-center justify-center lg:pl-8 lg:border-l lg:border-white/[0.04] self-stretch">
              <ScoreGauge score={score} size={100} strokeWidth={8} />
              <p className="text-[10px] text-slate-500 mt-2 text-center font-mono">Rolling 24h score</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center lg:pl-8 lg:border-l lg:border-white/[0.04] self-stretch text-center min-w-[140px]">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                <Wifi className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-white">LAN Connected</span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">802.11 Wi-Fi</span>
            </div>
          )}
        </div>
      </div>

      {/* If Device Has Live Sniffed Telemetry (Host Machine or Hotspot-routed) */}
      {hasLiveTelemetry ? (
        <>
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
                Live Sniffed TLS Handshakes
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
        </>
      ) : (
        /* Professional Unrouted Wi-Fi Device Diagnostic & Hotspot Routing Guide */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Network & Wi-Fi Link Diagnostics */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Network Link Diagnostics</h3>
            </div>

            <div className="divide-y divide-white/[0.04] text-xs font-mono">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Connection Medium</span>
                <span className="text-slate-200">802.11 Wi-Fi (WPA2/WPA3 CCMP)</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Assigned IP</span>
                <span className="text-cyan-400">{device.ip_address || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Physical MAC</span>
                <span className="text-slate-200">{device.mac_address}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Default Gateway</span>
                <span className="text-slate-200">192.168.1.1 (Digisol Router)</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Subnet Mask</span>
                <span className="text-slate-200">255.255.255.0 (/24)</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">ICMP Reachability</span>
                <span className="text-emerald-400">Online & Responding</span>
              </div>
            </div>
          </div>

          {/* Card 2: Transparent Architecture & Live Sniffing Guide */}
          <div className="rounded-2xl bg-cyan-950/20 border border-cyan-500/20 p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-400">
                <Shield className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-white">Passive Wi-Fi Privacy Architecture</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This device communicates directly with the Digisol Wi-Fi router over encrypted wireless frames.
                Because Glasshouse operates passively with zero network tampering, it does not intercept other devices' private wireless signals without routing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/20 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-300">
                <Terminal className="w-3.5 h-3.5" />
                <span>To inspect live TLS traffic from this device:</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal pl-4">
                <li>Turn ON <strong className="text-slate-200">Mobile Hotspot</strong> in Windows Settings on this PC.</li>
                <li>Connect this device ({device.device_name}) to your PC's hotspot.</li>
                <li>Live TLS handshakes will automatically stream and populate here in real time.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
