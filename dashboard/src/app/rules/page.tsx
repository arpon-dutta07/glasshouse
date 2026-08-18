"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Shield, ShieldCheck, ShieldAlert, Sliders, CheckCircle2 } from "lucide-react";
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
      setNotification(`Rule successfully created for ${domain}`);
      setDomainInput("");
      setTimeout(() => setNotification(null), 3000);
      loadRules();
    }
  };

  const handleDeleteRule = async (domain: string) => {
    const ok = await deleteCustomRule(domain);
    if (ok) {
      setNotification(`Rule deleted for ${domain}`);
      setTimeout(() => setNotification(null), 3000);
      loadRules();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb & Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Overview
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Custom Domain Rules</h1>
            <p className="text-xs text-slate-400">
              Override public blocklist classifications with custom allowlists and blocklists
            </p>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-200 text-xs font-mono text-center">
          {notification}
        </div>
      )}

      {/* Add Rule Form Card */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" /> Create Custom Classification Rule
        </h2>

        <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Domain / Subdomain
            </label>
            <input
              type="text"
              placeholder="e.g. telemetry.smartdevice.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-600"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Action
            </label>
            <select
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value as "allow" | "block")}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="block">Block (Flag Tracker)</option>
              <option value="allow">Allow (Mark Benign)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
            >
              Add Rule
            </button>
          </div>
        </form>
      </div>

      {/* Rules Table */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">Active Custom Rules</h2>
          <span className="text-xs font-mono text-slate-400">{rules.length} custom rules</span>
        </div>

        {rules.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No custom rules configured yet. Rules you add will take highest precedence over blocklists.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="pb-3 pl-2">Domain Pattern</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rules.map((r) => {
                  const isBlock = r.action === "block";
                  return (
                    <tr key={r.domain} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 pl-2 font-medium text-slate-200">{r.domain}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isBlock
                              ? "bg-rose-950/60 border-rose-800 text-rose-300"
                              : "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                          }`}
                        >
                          {isBlock ? <ShieldAlert className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                          {r.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{r.category}</td>
                      <td className="py-3 text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={() => handleDeleteRule(r.domain)}
                          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
