"use client";

import React, { useState } from "react";
import { Shield, ShieldAlert, AlertTriangle, X, Check, Info } from "lucide-react";
import { blockDomain, BlockingStatus } from "@/lib/api";

interface BlockModalProps {
  domain: string;
  category?: string;
  status: BlockingStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onBlocked: () => void;
}

export const BlockModal: React.FC<BlockModalProps> = ({
  domain,
  category = "tracker",
  status,
  isOpen,
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
      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
      : category === "tracker"
      ? "bg-red-500/20 text-red-300 border-red-500/30"
      : category === "ad_network"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : category === "first_party"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : "bg-slate-500/20 text-slate-300 border-slate-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0e0e17] border border-white/[0.08] p-6 shadow-2xl shadow-black space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isMalicious ? "bg-rose-500/20 text-rose-400" : "bg-red-500/20 text-red-400"}`}>
              {isMalicious ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Block Domain</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[240px]">
                {domain}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category & Status Banner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-xs text-slate-400">Current Classification</span>
            <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border capitalize ${categoryColor}`}>
              {category.replace(/_/g, " ")}
            </span>
          </div>

          {/* Mode Notice Banner */}
          {isTestMode ? (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>Test Mode Active (Simulated)</span>
              </div>
              <p className="text-[11px] text-cyan-300/80 pl-5">
                This block is tracked inside Glasshouse. Your Windows hosts file will <strong>not</strong> be modified.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Live Block Mode (System Hosts File)</span>
              </div>
              <p className="text-[11px] text-amber-300/80 pl-5">
                This will add <code>0.0.0.0 {domain}</code> to <code>C:\Windows\System32\drivers\etc\hosts</code>.
              </p>
            </div>
          )}

          {/* First Party Explicit Warning */}
          {isFirstParty && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Caution: First-Party Domain</span>
              </div>
              <p className="text-[11px] text-rose-300/80 pl-5">
                This is the primary domain of an application or website. Blocking it will likely break the app or service.
              </p>
            </div>
          )}

          {/* Consequence copy */}
          <p className="text-xs text-slate-400 leading-relaxed">
            Blocking this domain means your device can no longer reach it. Some app features might stop working if they depend on it.
          </p>

          {/* Reason Input */}
          <div>
            <label className="block text-[10px] uppercase font-medium text-slate-500 mb-1">
              Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Suspicious background telemetry"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-slate-200 focus:outline-none focus:border-red-500/40 font-mono placeholder:text-slate-600"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmBlock}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? "Blocking..." : "Confirm Block"}
          </button>
        </div>
      </div>
    </div>
  );
};
