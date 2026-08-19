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
      setNotification(`[RULE CREATED] ${actionInput.toUpperCase()} ${domainInput.trim()}`);
      setDomainInput("");
      setTimeout(() => setNotification(null), 3000);
      loadRules();
    }
  };

  const handleDeleteRule = async (domain: string) => {
    const ok = await deleteCustomRule(domain);
    if (ok) {
      setNotification(`[RULE REMOVED] ${domain}`);
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
    <div className="space-y-8 max-w-4xl mx-auto font-mono">
      {/* Breadcrumb & Header */}
      <div className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Overview
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 font-hud">
          <Sliders className="w-5 h-5 text-cyan-500" />
          CUSTOM CLASSIFICATION RULES
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
          Override default domain classifications or enforce local security allow/block behaviors
        </p>
      </div>

      {notification && (
        <div className="py-2 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs text-center font-mono animate-count">
          {notification}
        </div>
      )}

      {/* Add Rule Form */}
      <div className="rounded-2xl radar-panel p-5">
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2 font-hud">
          <Plus className="w-3.5 h-3.5 text-cyan-500" />
          ADD CUSTOM CLASSIFICATION OVERRIDE
        </h2>

        <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end font-sans">
          <div className="sm:col-span-6">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Domain Name
            </label>
            <input
              type="text"
              placeholder="e.g. telemetry.example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#090d16]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono shadow-sm"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Action
            </label>
            <select
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value as "allow" | "block")}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#090d16]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono shadow-sm"
            >
              <option value="block">Block</option>
              <option value="allow">Allow</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Category
            </label>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#090d16]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono shadow-sm"
            >
              <option value="tracker">Tracker</option>
              <option value="ad_network">Ad Network</option>
              <option value="malicious">Malicious</option>
              <option value="first_party">First Party</option>
            </select>
          </div>

          <div className="sm:col-span-12 flex justify-end pt-1">
            <button
              type="submit"
              disabled={!domainInput.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>SAVE OVERRIDE RULE</span>
            </button>
          </div>
        </form>
      </div>

      {/* Rules Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest font-hud">
            ACTIVE OVERRIDE RULES ({rules.length})
          </h2>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search custom rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#090d16]/80 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm"
            />
          </div>
        </div>

        <div className="rounded-2xl radar-panel overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              Loading rules...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-1">
              <Sparkles className="w-8 h-8 text-slate-400/40 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300 font-hud">No custom rules configured</p>
              <p className="text-[11px] text-slate-400">Add an override above or click [ALLOW] / [BLOCK] in the live feed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.06] text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-3 px-4">DOMAIN</th>
                    <th className="py-3 px-4">ACTION</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4">CREATED</th>
                    <th className="py-3 px-4 text-right">REMOVE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03] text-[11px]">
                  {filtered.map((r) => (
                    <tr key={r.domain} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">{r.domain}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                            r.action === "allow"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          {r.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 capitalize">{r.category.replace(/_/g, " ")}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(r.domain)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
