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
          ? "Switched to Test Mode: Blocking is now simulated without modifying hosts file."
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Overview
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-red-400" />
            Blocked Domains & Firewall
          </h1>
          <p className="text-xs text-slate-500">
            Local-machine hosts file domain blocking with safety guardrails
          </p>
        </div>

        {/* Mode Toggle Control */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-300">
              {isTestMode ? "Test Mode (Simulated)" : "Live Block Mode"}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {isTestMode ? "Hosts file safe" : "Hosts file active"}
            </p>
          </div>
          <button
            onClick={handleToggleMode}
            disabled={actionLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              !isTestMode ? "bg-red-500" : "bg-cyan-500/30"
            }`}
            title="Toggle between Test Mode (simulated) and Live Block Mode (writes to hosts file)"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                !isTestMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`py-2.5 px-4 rounded-xl text-xs font-mono flex items-center gap-2 animate-count ${
            notification.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Mode Explanation Banner */}
      {isTestMode ? (
        <div className="p-4 rounded-2xl bg-cyan-500/[0.06] border border-cyan-500/20 text-cyan-300 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Test Mode is Currently Active (Default)</span>
          </div>
          <p className="text-[11px] text-cyan-300/80 leading-relaxed pl-6">
            In Test Mode, blocking a domain tracks it inside Glasshouse to demonstrate what would be blocked. Your system hosts file (<code>C:\Windows\System32\drivers\etc\hosts</code>) remains untouched. Toggle to <strong>Live Block Mode</strong> when you are ready to enforce real blocking.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-300 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Live Block Mode is Active</span>
          </div>
          <p className="text-[11px] text-amber-300/80 leading-relaxed pl-6">
            Blocked domains are written directly to your Windows hosts file (<code>0.0.0.0 domain</code>) inside the isolated <code># --- GLASSHOUSE BLOCKED DOMAINS ---</code> section. Core cloud infrastructure is protected.
          </p>
        </div>
      )}

      {/* Block Domain Form */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 space-y-4">
        <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Block New Domain
        </h2>

        <form onSubmit={handleBlockSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Domain (e.g. ad.example.com)
            </label>
            <input
              type="text"
              placeholder="e.g. telemetry-feed.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-red-500/40 font-mono placeholder:text-slate-600"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Category
            </label>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-red-500/40 font-mono"
            >
              <option value="tracker" className="bg-slate-900 text-slate-200">Tracker</option>
              <option value="ad_network" className="bg-slate-900 text-slate-200">Ad Network</option>
              <option value="malicious" className="bg-slate-900 text-slate-200">Flagged — Malicious</option>
              <option value="unknown" className="bg-slate-900 text-slate-200">Unclassified</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block Domain</span>
            </button>
          </div>
        </form>
      </div>

      {/* Blocked Domains Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Blocklist
            </h2>
            <p className="text-xs text-slate-500">
              {blockedDomains.length} domain{blockedDomains.length !== 1 ? "s" : ""} registered
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter blocked domains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-red-500/40 font-mono placeholder:text-slate-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-600 text-xs font-mono">
            Loading blocked domains...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] py-12 text-center space-y-2">
            <ShieldCheck className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No domains blocked yet</p>
            <p className="text-[11px] text-slate-600">
              Block intrusive trackers or threats directly from the live feed or using the form above.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.04] text-[10px] uppercase font-medium text-slate-500">
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Date Blocked</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-[11px]">
                {filtered.map((b) => (
                  <tr key={b.domain} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div>{b.domain}</div>
                      {b.reason && (
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {b.reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-300 capitalize">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            b.category === "malicious"
                              ? "bg-rose-500"
                              : b.category === "tracker"
                              ? "bg-red-400"
                              : "bg-amber-400"
                          }`}
                        />
                        {b.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          b.mode === "live"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                        }`}
                      >
                        {b.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(b.blocked_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleUnblock(b.domain)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors text-[11px]"
                        title="Unblock domain"
                      >
                        Unblock
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
  );
}
