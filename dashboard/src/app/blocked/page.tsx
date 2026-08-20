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
  Plus,
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
          ? "Switched to Test Mode: Domain blocking is simulated in the UI."
          : "Switched to Live Block Mode: Active blocks are written directly to your system hosts file.",
      });
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } else {
      setNotification({
        type: "error",
        message: "Failed to switch blocking mode. Ensure backend is running with Administrator privileges.",
      });
    }
    setActionLoading(false);
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setActionLoading(true);
    const res = await blockDomain(domainInput.trim(), categoryInput, reasonInput.trim() || undefined);
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
    <div className="space-y-8 max-w-5xl mx-auto font-sans">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight flex items-center gap-3">
            <Shield className="w-7 h-7 text-rose-500" />
            Blocked Domains
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Local-machine hosts file domain blocking with safety infrastructure guardrails
          </p>
        </div>

        {/* Animated Toggle Switch */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl glass-card">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 dark:text-white font-heading">
              {isTestMode ? "Simulated Mode" : "Live Hosts Mode"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isTestMode ? "UI simulation only" : "System hosts active"}
            </p>
          </div>
          <button
            onClick={handleToggleMode}
            disabled={actionLoading}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
              isTestMode
                ? "bg-slate-200 dark:bg-white/[0.1]"
                : "bg-rose-500 shadow-md shadow-rose-500/30"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                isTestMode ? "translate-x-1" : "translate-x-6"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mode Explainer Banner */}
      <div
        className={`p-5 rounded-3xl border text-sm flex items-start gap-3.5 ${
          isTestMode
            ? "bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-200/80 dark:border-indigo-500/20 text-indigo-900 dark:text-indigo-200"
            : "bg-rose-50/60 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20 text-rose-900 dark:text-rose-200"
        }`}
      >
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
        <div className="space-y-1">
          <p className="font-bold text-sm font-heading">
            {isTestMode ? "Test Mode Active (Recommended for Diagnostics)" : "Direct Hosts File Enforcement Active"}
          </p>
          <p className="text-xs sm:text-sm leading-relaxed opacity-90">
            {isTestMode
              ? "Blocked domains are tracked and flagged in your live dashboard feed without modifying your operating system's hosts file. Safe for testing and evaluation."
              : `Blocked domains are routed to 0.0.0.0 in your OS hosts file (${status?.hosts_path || "hosts"}). All matching outbound traffic will be blocked at the OS resolver level.`}
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`py-3 px-5 rounded-2xl text-xs sm:text-sm text-center font-medium animate-count border ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Add Block Form Card */}
      <div className="rounded-3xl glass-card p-6 sm:p-7 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-heading">
          <Plus className="w-4 h-4 text-rose-500" />
          Manually Block a Domain
        </h2>

        <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-5 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Domain Name
            </label>
            <input
              type="text"
              placeholder="e.g. tracker.analytics.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="sm:col-span-3 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="tracker">Tracker</option>
              <option value="ad_network">Ad Network</option>
              <option value="malicious">Malicious</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="sm:col-span-4 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Telemetry beacon"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
            />
          </div>

          <div className="sm:col-span-12 flex justify-end pt-2">
            <button
              type="submit"
              disabled={actionLoading || !domainInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-rose-500/20"
            >
              <Ban className="w-4 h-4" />
              <span>Block Domain</span>
            </button>
          </div>
        </form>
      </div>

      {/* Blocked Domains Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
            Active Block Rules ({blockedDomains.length})
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search blocked domains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="rounded-3xl glass-card overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Loading blocked domains...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">No blocked domains</p>
              <p className="text-xs text-slate-400">Use the form above or block trackers directly from the live feed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="py-3.5 px-5">Domain</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5">Reason</th>
                    <th className="py-3.5 px-5">Date Blocked</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03] text-sm">
                  {filtered.map((b) => (
                    <tr key={b.domain} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">{b.domain}</td>
                      <td className="py-3.5 px-5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 capitalize">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 truncate max-w-xs">{b.reason || "—"}</td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {new Date(b.blocked_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleUnblock(b.domain)}
                          disabled={actionLoading}
                          className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-white/[0.06] transition-colors text-xs font-semibold"
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
    </div>
  );
}
