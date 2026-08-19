"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Sliders, CheckCircle2, Ban } from "lucide-react";
import { CustomRule, fetchCustomRules, addCustomRule, deleteCustomRule } from "@/lib/api";

export default function RulesPage() {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [actionInput, setActionInput] = useState<"allow" | "block">("block");
  const [categoryInput, setCategoryInput] = useState("tracker");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const loadRules = async () => {
    setLoading(true);
    const list = await fetchCustomRules();
    setRules(list);
    setLoading(false);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    const domain = domainInput.toLowerCase().trim();
    const ok = await addCustomRule(domain, actionInput, categoryInput);
    if (ok) {
      setNotification(`[RULE CREATED] ${actionInput.toUpperCase()} ${domain}`);
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

  return (
    <div className="space-y-8 max-w-3xl mx-auto font-mono">
      {/* Breadcrumb & Header */}
      <div className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-3 font-sans"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Overview
        </Link>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5 font-hud">
          <Sliders className="w-5 h-5 text-cyan-400" />
          CUSTOM CLASSIFICATION RULES
        </h1>
        <p className="text-xs text-slate-400 font-sans">
          Manual overrides evaluated before public blocklist matching
        </p>
      </div>

      {notification && (
        <div className="py-2 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs text-center animate-count">
          {notification}
        </div>
      )}

      {/* Add Rule Form */}
      <div className="rounded-2xl radar-panel p-5">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          ADD CUSTOM CLASSIFICATION OVERRIDE
        </h2>

        <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Domain Name
            </label>
            <input
              type="text"
              placeholder="e.g. telemetry.example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Action
            </label>
            <select
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value as "allow" | "block")}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="block">Block</option>
              <option value="allow">Allow</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Category
            </label>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50"
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
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>SAVE OVERRIDE RULE</span>
            </button>
          </div>
        </form>
      </div>

      {/* Rules Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          ACTIVE OVERRIDE RULES ({rules.length})
        </h2>

        <div className="rounded-2xl radar-panel overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              Loading rules...
            </div>
          ) : rules.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-1 font-sans">
              <p className="font-semibold text-slate-400">No custom rules</p>
              <p className="text-[11px] text-slate-600 font-mono">
                Add domain overrides using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-4">DOMAIN</th>
                    <th className="py-3 px-4">ACTION</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-[11px]">
                  {rules.map((rule) => (
                    <tr key={rule.domain} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-100">
                        {rule.domain}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            rule.action === "allow"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                        >
                          {rule.action === "allow" ? (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          ) : (
                            <Ban className="w-2.5 h-2.5" />
                          )}
                          {rule.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 uppercase">
                        {rule.category}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(rule.domain)}
                          className="p-1 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors"
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
