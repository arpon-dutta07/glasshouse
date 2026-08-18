"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Shield, ShieldAlert, ShieldCheck, Clock, Laptop, Smartphone, Tv, Cpu, Wifi, Ban, CheckCircle2 } from "lucide-react";
import { Device, ConnectionEvent, fetchDeviceDetails, addCustomRule } from "@/lib/api";
import { ScoreGauge } from "@/components/ScoreGauge";

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

  const loadDetails = async () => {
    if (!mac) return;
    const res = await fetchDeviceDetails(mac);
    setDeviceData(res);
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

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-mono text-xs">
        Loading device diagnostics for {mac}...
      </div>
    );
  }

  if (!deviceData || !deviceData.device) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-200">Device Not Found</h2>
        <p className="text-xs text-slate-400">No observed telemetry records for MAC address: {mac}</p>
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <ArrowLeft className="w-4 h-4" /> Return to Overview
        </Link>
      </div>
    );
  }

  const { device, score_history, recent_connections } = deviceData;
  const score = device.current_score ?? 100;
  const trackerConns = recent_connections.filter((c) => c.classification === "tracker" || c.classification === "ad_network");
  const uniqueDomains = Array.from(new Set(recent_connections.map((c) => c.sni_domain)));
  const uniqueTrackers = Array.from(new Set(trackerConns.map((c) => c.sni_domain)));

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Network Overview
        </Link>
        <span className="text-xs font-mono text-slate-400">
          Last Active: {new Date(device.last_seen).toLocaleString()}
        </span>
      </div>

      {notification && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-200 text-xs font-mono text-center">
          {notification}
        </div>
      )}

      {/* Main Device Hero Banner */}
      <div className="glass-card rounded-3xl p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Info */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-cyan-950/80 border border-cyan-800 text-cyan-300">
              {device.vendor || "Generic Device"}
            </span>
            <span className="text-xs font-mono text-slate-400">IP: {device.ip_address || "—"}</span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            {device.device_name || "Observed Host"}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <p className="text-[10px] uppercase font-semibold text-slate-400">MAC Address</p>
              <p className="text-xs font-mono text-slate-200 mt-0.5 truncate">{device.mac_address}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <p className="text-[10px] uppercase font-semibold text-slate-400">First Observed</p>
              <p className="text-xs font-mono text-slate-200 mt-0.5">
                {new Date(device.first_seen).toLocaleDateString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Unique Trackers</p>
              <p className="text-xs font-mono text-rose-400 mt-0.5">{uniqueTrackers.length} domains</p>
            </div>
          </div>
        </div>

        {/* Right Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60">
          <ScoreGauge score={score} size={140} strokeWidth={12} />
          <p className="text-xs text-slate-400 mt-3 text-center">
            Calculated over rolling 24h traffic window
          </p>
        </div>
      </div>

      {/* 24-Hour Score History */}
      {score_history.length > 0 && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" /> Score Timeline & Historical Readings
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {score_history.slice(-12).map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center font-mono"
              >
                <div className="text-lg font-bold text-cyan-400">{item.score}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(item.computed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-[10px] text-rose-400/80 mt-0.5">
                  {item.tracker_count}/{item.total_count} trk
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Logs Table */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Recent Outbound TLS Handshakes</h3>
            <p className="text-xs text-slate-400">Inspected Server Name Indication (SNI) hostnames</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{recent_connections.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
                <th className="pb-3 pl-2">Domain (SNI)</th>
                <th className="pb-3">Classification</th>
                <th className="pb-3">Destination IP</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recent_connections.map((conn, idx) => {
                const isTracker = conn.classification === "tracker" || conn.classification === "ad_network";
                return (
                  <tr key={conn.id || idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 pl-2 font-medium text-slate-200">
                      {conn.sni_domain}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isTracker
                            ? "bg-rose-950/60 border-rose-800 text-rose-300"
                            : conn.classification === "first_party"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : "bg-slate-800 border-slate-700 text-slate-300"
                        }`}
                      >
                        {conn.classification.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{conn.destination_ip || conn.dst_ip || "—"}</td>
                    <td className="py-3 text-slate-400">{new Date(conn.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 text-right pr-2">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleRuleAction(conn.sni_domain, "allow")}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 text-slate-400 transition-colors text-[10px]"
                          title="Allow domain"
                        >
                          Allow
                        </button>
                        <button
                          onClick={() => handleRuleAction(conn.sni_domain, "block")}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors text-[10px]"
                          title="Block domain"
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
  );
}
