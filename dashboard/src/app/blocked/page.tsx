"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Trash2,
  AlertTriangle,
  Info,
  Check,
  Search,
  Lock,
  Terminal,
} from "lucide-react";
import {
  BlockedDomain,
  BlockingStatus,
  fetchBlockedDomains,
  fetchBlockingStatus,
  toggleBlockingMode,
  blockDomain,
  unblockDomain,
} from "@/lib/api";

export default function BlockedDomainsPage() {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [status, setStatus] = useState<BlockingStatus | null>(null);
  const [search, setSearch] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("tracker");
  const [reasonInput, setReasonInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [domains, stat] = await Promise.all([
      fetchBlockedDomains(),
      fetchBlockingStatus(),
    ]);
    setBlockedDomains(domains);
    setStatus(stat);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMode = async () => {
    if (!status) return;
    setActionLoading(true);
    const newMode = !status.test_mode;
    const ok = await toggleBlockingMode(newMode);
    if (ok) {
      setStatus({ ...status, test_mode: newMode });
      setNotification({
        type: "success",
        message: newMode
          ? "Switched to Test Mode: Blocking is simulated without modifying hosts file."
          : "Switched to Live Block Mode: Active blocks are written directly to your system hosts file.",
      });
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } else {
      setNotification({ type: "error", message: "Failed to switch blocking mode." });
    }
    setActionLoading(false);
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setActionLoading(true);
    const res = await blockDomain(domainInput.trim(), categoryInput, reasonInput.trim());
    setActionLoading(false);

    if (res.success) {
      setNotification({ type: "success", message: res.message });
      setDomainInput("");
      setReasonInput("");
      setTimeout(() => setNotification(null), 3500);
      loadData();
    } else {
      setNotification({ type: "error", message: res.message });
    }
  };

  const handleUnblock = async (domain: string) => {
    setActionLoading(true);
    const res = await unblockDomain(domain);
    setActionLoading(false);

    if (res.success) {
      setNotification({ type: "success", message: res.message });
      setTimeout(() => setNotification(null), 3500);
      loadData();
    } else {
      setNotification({ type: "error", message: res.message });
    }
  };

  const filtered = blockedDomains.filter(
    (b) =>
      b.domain.toLowerCase().includes(search.toLowerCase()) ||
      (b.reason && b.reason.toLowerCase().includes(search.toLowerCase())) ||
      b.category.toLowerCase().includes(search.toLowerCase())
  );

  const isTestMode = status?.test_mode ?? true;

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-mono">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Overview
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5 font-hud">
            <Shield className="w-5 h-5 text-red-400" />
            BLOCKED DOMAINS & FIREWALL
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Local-machine hosts file domain blocking with safety guardrails
          </p>
        </div>

        {/* Animated Pill Mode Toggle Control */}
        <div className="flex items-center gap-3 p-2.5 rounded-2xl radar-panel border border-white/[0.08]">
          <div className="text-right font-sans">
            <p className="text-[11px] font-bold text-slate-200 font-hud">
              {isTestMode ? "TEST MODE" : "LIVE BLOCK MODE"}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {isTestMode ? "Simulated in UI" : "Hosts file active"}
            </p>
          </div>
          <button
            onClick={handleToggleMode}
            disabled={actionLoading}
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 border ${
              isTestMode
                ? "bg-amber-500/20 border-amber-500/40"
                : "bg-red-500/30 border-red-500/50 shadow-[0_0_12px_rgba(248,113,113,0.3)]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full transition-all duration-300 ${
                isTestMode ? "translate-x-1.5 bg-amber-400" : "translate-x-6 bg-red-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mode Explainer Banner */}
      <div
        className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
          isTestMode
            ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
            : "bg-red-500/10 border-red-500/20 text-red-300"
        }`}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 font-sans">
          <p className="font-semibold">
            {isTestMode
              ? "Test Mode Active (Safety First)"
              : "Live Block Mode Active (Modifying Hosts File)"}
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {isTestMode
              ? "Blocked domains are classified as blocked in the live radar feed, but your operating system hosts file is NOT modified. Switch to Live Block Mode if you want OS-level DNS blocking on this PC."
              : `Active rules are written directly to ${status?.hosts_path || "system hosts file"}. Blocked domains resolve to 0.0.0.0, terminating outbound TLS ClientHello attempts before they leave your machine.`}
          </p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`py-2 px-4 rounded-xl text-xs text-center border font-mono animate-count ${
            notification.type === "success"
              ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
              : "bg-red-500/10 text-red-300 border-red-500/20"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Add Block Rule Form */}
      <div className="rounded-2xl radar-panel p-5">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Ban className="w-3.5 h-3.5 text-red-400" />
          MANUALLY BLOCK DOMAIN
        </h2>

        <form onSubmit={handleBlockSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Domain Name
              </label>
              <input
                type="text"
                placeholder="e.g. telemetry.example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono placeholder:text-slate-600"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Category
              </label>
              <select
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono"
              >
                <option value="tracker">Tracker</option>
                <option value="ad_network">Ad Network</option>
                <option value="malicious">Malicious</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                placeholder="Optional description"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={actionLoading || !domainInput.trim()}
              className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold font-mono transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(248,113,113,0.15)]"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>BLOCK DOMAIN</span>
            </button>
          </div>
        </form>
      </div>

      {/* Blocked Domains Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            ACTIVE BLOCKED DOMAINS ({blockedDomains.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search blocked domains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="rounded-2xl radar-panel overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              Loading blocked domains...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-1 font-sans">
              <p className="font-semibold text-slate-400">No blocked domains</p>
              <p className="text-[11px] text-slate-600 font-mono">
                Click [BLOCK] in the live radar feed or add a domain above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-4">DOMAIN</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4">BLOCKED AT</th>
                    <th className="py-3 px-4">REASON / NOTE</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-[11px]">
                  {filtered.map((b) => (
                    <tr key={b.domain} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-100 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span>{b.domain}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(b.blocked_at).toLocaleDateString()}{" "}
                        {new Date(b.blocked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {b.reason || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleUnblock(b.domain)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-emerald-500/15 hover:text-emerald-300 text-slate-400 border border-white/[0.06] text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          UNBLOCK
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
