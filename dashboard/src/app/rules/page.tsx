"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Shield, Search, Sliders, Info, Sparkles } from "lucide-react";
import { CustomRule, fetchCustomRules, addCustomRule, deleteCustomRule } from "@/lib/api";

export default function RulesPage() {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [search, setSearch] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [actionInput, setActionInput] = useState<"allow" | "block">("block");
  const [categoryInput, setCategoryInput] = useState("tracker");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const loadRules = async () => {
    setLoading(true);
    const data = await fetchCustomRules();
    setRules(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    const ok = await addCustomRule(domainInput.trim(), actionInput, categoryInput);
    if (ok) {
      setNotification(`Rule created: ${actionInput.toUpperCase()} ${domainInput.trim()}`);
      setDomainInput("");
      setTimeout(() => setNotification(null), 3000);
      loadRules();
    }
  };

  const handleDeleteRule = async (domain: string) => {
    const ok = await deleteCustomRule(domain);
    if (ok) {
      setNotification(`Rule removed: ${domain}`);
      setTimeout(() => setNotification(null), 3000);
      loadRules();
    }
  };

  const filtered = rules.filter(
    (r) =>
      r.domain.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans">
      {/* Breadcrumb & Header */}
      <div className="space-y-1.5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3 font-heading">
          <Sliders className="w-7 h-7 text-indigo-500" />
          Custom Classification Rules
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Override default domain classifications or enforce local security allow/block behaviors
        </p>
      </div>

      {notification && (
        <div className="py-3 px-5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm text-center font-medium animate-count">
          {notification}
        </div>
      )}

      {/* Add Rule Form Card */}
      <div className="rounded-3xl glass-card p-6 sm:p-7 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-heading">
          <Plus className="w-4 h-4 text-indigo-500" />
          Add Classification Override
        </h2>

        <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          <div className="sm:col-span-6 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Domain Name
            </label>
            <input
              type="text"
              placeholder="e.g. telemetry.example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
              required
            />
          </div>

          <div className="sm:col-span-3 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Action
            </label>
            <select
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value as "allow" | "block")}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="block">Block</option>
              <option value="allow">Allow</option>
            </select>
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
              <option value="first_party">First Party</option>
            </select>
          </div>

          <div className="sm:col-span-12 flex justify-end pt-2">
            <button
              type="submit"
              disabled={!domainInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Save Rule</span>
            </button>
          </div>
        </form>
      </div>

      {/* Rules Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
            Configured Rules ({rules.length})
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search custom rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="rounded-3xl glass-card overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Loading rules...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm space-y-2">
              <Sparkles className="w-10 h-10 text-slate-400/40 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300 font-heading">No custom rules configured</p>
              <p className="text-xs text-slate-400">Add an override above or click Allow / Block in the live activity feed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/[0.06] text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="py-3.5 px-5">Domain</th>
                    <th className="py-3.5 px-5">Action</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5">Created</th>
                    <th className="py-3.5 px-5 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03] text-sm">
                  {filtered.map((r) => (
                    <tr key={r.domain} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white">{r.domain}</td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                            r.action === "allow"
                              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                              : "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20"
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 capitalize">{r.category.replace(/_/g, " ")}</td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleDeleteRule(r.domain)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
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
