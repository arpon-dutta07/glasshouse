"use client";

import React, { useState } from "react";
import { Shield, ShieldAlert, AlertTriangle, X, Check, Info, Lock, Ban } from "lucide-react";
import { blockDomain, BlockingStatus } from "@/lib/api";

interface BlockModalProps {
  domain: string;
  category?: string;
  status: BlockingStatus | null;
  isOpen?: boolean;
  onClose: () => void;
  onBlocked: () => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  domain,
  category = "tracker",
  status,
  isOpen = true,
  onClose,
  onBlocked,
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isFirstParty = category === "first_party";
  const isMalicious = category === "malicious";
  const isTestMode = status?.test_mode ?? true;

  const handleConfirmBlock = async () => {
    setLoading(true);
    setError(null);
    const res = await blockDomain(domain, category, reason || `Blocked as ${category}`);
    setLoading(false);
    if (res.success) {
      onBlocked();
      onClose();
    } else {
      setError(res.message);
    }
  };

  const categoryColor =
    category === "malicious"
      ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30"
      : category === "tracker"
      ? "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30"
      : category === "ad_network"
      ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
      : category === "first_party"
      ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
      : "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md font-sans">
      <div className="relative w-full max-w-md rounded-3xl glass-card bg-white/95 dark:bg-[#10131e]/95 p-6 sm:p-7 shadow-2xl shadow-black/20 dark:shadow-black/70 space-y-5 border border-slate-200/80 dark:border-white/[0.08]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0 shadow-sm">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
              Block Domain
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add domain to local DNS firewall
            </p>
          </div>
        </div>

        {/* Target Domain Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Domain</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryColor}`}>
              {category.replace(/_/g, " ")}
            </span>
          </div>
          <p className="font-mono font-bold text-sm text-slate-900 dark:text-white truncate">{domain}</p>
        </div>

        {/* First Party Warning Guardrail */}
        {isFirstParty && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-900 dark:text-amber-200">First-Party Domain</p>
              <p className="text-amber-700 dark:text-amber-300/80 leading-relaxed">
                Blocking this domain might break core functionality or login for apps that depend on it.
              </p>
            </div>
          </div>
        )}

        {/* Mode Info Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{isTestMode ? "Simulated Test Mode" : "Live Hosts File Mode"}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            {isTestMode
              ? "This action will be simulated and marked in the live stream without altering your OS hosts file."
              : `This domain will be mapped to 0.0.0.0 in your OS hosts file (${status?.hosts_path || "hosts"}).`}
          </p>
        </div>

        {/* Optional Reason Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Custom Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Telemetry beacon from third party"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/50 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 placeholder:text-slate-400"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmBlock}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-rose-500/20"
          >
            {loading ? "Blocking..." : "Confirm Block"}
          </button>
        </div>
      </div>
    </div>
  );
};
