"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Sliders } from "lucide-react";
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
      setNotification(`Rule created: ${actionInput.toUpperCase()} ${domain}`);
      setDomainInput("");
      setTimeout(() => setNotification(null), 3000);
      loadRules();
    }
  };

  const handleDeleteRule = async (domain: string) => {
    const ok = await deleteCustomRule(domain);
    if (ok) {
      setNotification(`Rule deleted: ${domain}`);
      setTimeout(() => setNotification(null), 3000);
      loadRules();
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="space-y-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Overview
        </Link>
        <h1 className="text-xl font-bold text-white tracking-tight">Classification Rules</h1>
        <p className="text-xs text-slate-500">
          User overrides applied before public blocklist matching
        </p>
      </div>

      {notification && (
        <div className="py-2 px-4 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-mono text-center">
          {notification}
        </div>
      )}

      {/* Add Rule Form */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
        <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
          Add Custom Override
        </h2>

        <form onSubmit={handleAddRule} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Domain Name
            </label>
            <input
              type="text"
              placeholder="e.g. telemetry.example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 font-mono placeholder:text-slate-600"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Action
            </label>
            <select
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value as "allow" | "block")}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/40 font-mono"
            >
              <option value="block" className="bg-slate-900 text-slate-200">Block (Tracker)</option>
              <option value="allow" className="bg-slate-900 text-slate-200">Allow (Benign)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium text-xs transition-colors"
            >
              Add Rule
            </button>
          </div>
        </form>
      </div>

      {/* Rules Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Rules</h2>
          <span className="text-[11px] font-mono text-slate-600">{rules.length} custom</span>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-xl bg-white/[0.015] border border-white/[0.04] py-12 text-center text-slate-600 text-xs font-mono">
            No custom rules configured.
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.04] text-[10px] uppercase font-medium text-slate-500">
                  <th className="py-3 px-4">Domain Pattern</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-[11px]">
                {rules.map((r) => {
                  const isBlock = r.action === "block";
                  return (
                    <tr key={r.domain} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-200">{r.domain}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-300 capitalize">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isBlock ? "bg-red-400" : "bg-emerald-400"
                            }`}
                          />
                          {r.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(r.domain)}
                          className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-slate-600 transition-colors"
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
