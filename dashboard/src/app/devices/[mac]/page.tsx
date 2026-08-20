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
  History,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Device, ConnectionEvent, DeviceSession, fetchDeviceDetails, addCustomRule, renameDevice, deleteDevice } from "@/lib/api";
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
    sessions?: DeviceSession[];
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
      setNotification(`Rule applied: ${action.toUpperCase()} ${domain}`);
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
      <div className="py-28 text-center text-slate-500 text-sm">
        Loading device profile for {mac}...
      </div>
    );
  }

  if (!deviceData || !deviceData.device) {
    return (
      <div className="rounded-3xl glass-card p-12 text-center space-y-4 max-w-lg mx-auto font-sans">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Device Not Found</h2>
        <p className="text-sm text-slate-500 font-mono">No record found for MAC: {mac}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Overview
        </Link>
      </div>
    );
  }

  const { device, score_history, recent_connections, sessions = [] } = deviceData;
  const hasLiveTelemetry = recent_connections.length > 0;
  const score = device.current_score ?? 100;
  const trackerConns = recent_connections.filter(
    (c) => c.classification === "tracker" || c.classification === "ad_network"
  );
  const uniqueTrackers = Array.from(new Set(trackerConns.map((c) => c.sni_domain)));
  const Icon = getDeviceIcon(device.vendor, device.device_name);
  const isOnline = device.is_online !== false;

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 dark:text-slate-400">
            Last seen {new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={handleDeleteDevice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold transition-colors"
            title="Forget device"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Forget Device</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="py-3 px-5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm text-center font-medium animate-count">
          {notification}
        </div>
      )}

      {/* Main Device Hero Banner */}
      <div className="rounded-3xl glass-card p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Left Device Summary */}
          <div className="space-y-5 flex-1 min-w-0">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-sm">
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {device.vendor || "Connected Wi-Fi Device"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isOnline
                        ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                        : "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    {isOnline ? "Active on Network" : "Offline"}
                  </span>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/60 border border-indigo-500 text-base text-slate-900 dark:text-white font-bold focus:outline-none max-w-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm"
                      title="Save name"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setNameInput(device.device_name || "");
                        setIsEditing(false);
                      }}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 group/title mt-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate font-heading">
                      {device.device_name || "Wi-Fi Device"}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 opacity-60 group-hover/title:opacity-100 transition-opacity rounded-lg"
                      title="Rename device"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04]">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">IP Address</span>
                <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1">{device.ip_address || "—"}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04]">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">MAC Address</span>
                <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1 truncate">{device.mac_address}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04]">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Manufacturer</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{device.vendor || "Generic Device"}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04]">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">First Discovered</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {new Date(device.first_seen).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Right Status or Score Gauge */}
          {hasLiveTelemetry ? (
            <div className="flex flex-col items-center justify-center lg:pl-8 lg:border-l lg:border-slate-200/80 dark:lg:border-white/[0.06] self-stretch">
              <ScoreGauge score={score} size={145} />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center font-medium">Rolling 24-hour score</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center lg:pl-8 lg:border-l lg:border-slate-200/80 dark:lg:border-white/[0.06] self-stretch text-center min-w-[170px]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-sm">
                <Wifi className="w-8 h-8" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-heading">LAN Connected</span>
              <span className="text-xs text-slate-500 mt-0.5">802.11 Wi-Fi Link</span>
            </div>
          )}
        </div>
      </div>

      {/* If Device Has Live Sniffed Telemetry */}
      {hasLiveTelemetry ? (
        <>
          {/* Score History Timeline */}
          {score_history.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-heading">
                <Clock className="w-4 h-4 text-indigo-500" /> Score Timeline
              </h3>
              <div className="rounded-3xl glass-card p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-center">
                  {score_history.slice(-12).map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/[0.04]">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white font-heading">{item.score}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(item.computed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                        {item.tracker_count} trk
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Connection Logs Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Observed TLS Handshakes ({recent_connections.length})
              </h3>
              <div className="flex items-center gap-3">
                <CategoryLegend />
              </div>
            </div>

            <div className="rounded-3xl glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="py-3.5 px-5">Domain (SNI)</th>
                      <th className="py-3.5 px-5">Category</th>
                      <th className="py-3.5 px-5">Destination</th>
                      <th className="py-3.5 px-5">Time</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03] text-sm">
                    {recent_connections.map((conn, idx) => {
                      const isMalicious = conn.classification === "malicious";
                      const isTracker =
                        conn.classification === "tracker" || conn.classification === "ad_network";
                      const dotColor = isMalicious
                        ? "bg-rose-500 ring-2 ring-rose-400"
                        : isTracker
                        ? "bg-red-500"
                        : conn.classification === "first_party"
                        ? "bg-emerald-500"
                        : "bg-slate-400";

                      return (
                        <tr key={conn.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">
                            {conn.sni_domain}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 capitalize font-medium text-xs">
                              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                              {(conn.classification || "unknown").replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-slate-500 dark:text-slate-400 text-xs">
                            {conn.destination_ip || conn.dst_ip || "—"}
                          </td>
                          <td className="py-3.5 px-5 text-slate-500 text-xs">
                            {new Date(conn.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleRuleAction(conn.sni_domain, "allow")}
                                className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.04] hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-white/[0.06] transition-colors font-medium"
                              >
                                Allow
                              </button>
                              <button
                                onClick={() => handleRuleAction(conn.sni_domain, "block")}
                                className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.04] hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200/80 dark:border-white/[0.06] transition-colors font-medium"
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
        /* Unrouted Wi-Fi Device Diagnostic & Hotspot Routing Guide */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Network & Wi-Fi Link Diagnostics */}
          <div className="rounded-3xl glass-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5">
              <Network className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">Network Link Diagnostics</h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.04] text-xs">
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Connection Medium</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">802.11 Wi-Fi (WPA2/WPA3 CCMP)</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Assigned IP</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{device.ip_address || "—"}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Physical MAC</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{device.mac_address}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Default Gateway</span>
                <span className="text-slate-800 dark:text-slate-200">192.168.1.1 (Router Gateway)</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Subnet Mask</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">255.255.255.0 (/24)</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-slate-500">Reachability</span>
                <span className={isOnline ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-500"}>
                  {isOnline ? "Online & Responding" : "Offline / Sleeping"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Architecture & Live Sniffing Guide */}
          <div className="rounded-3xl glass-card p-6 sm:p-7 space-y-4 flex flex-col justify-between border-indigo-200/60 dark:border-indigo-500/20 bg-gradient-to-tr from-indigo-500/[0.04] to-transparent">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                <Shield className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">Passive Privacy Architecture</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                This device communicates directly with your network router over encrypted wireless frames.
                Because Glasshouse operates passively with zero network tampering, it does not intercept other devices' private wireless signals without routing.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-black/40 border border-slate-200/80 dark:border-white/[0.08] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white font-heading">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <span>To inspect live TLS handshakes from this device:</span>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-decimal pl-4">
                <li>Turn ON <strong className="text-indigo-600 dark:text-indigo-400">Mobile Hotspot</strong> in Windows Settings on this PC.</li>
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
