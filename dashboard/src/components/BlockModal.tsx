"use client";

import React, { useState } from "react";
import { Shield, ShieldAlert, AlertTriangle, X, Check, Info, Lock } from "lucide-react";
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
      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
      : category === "tracker"
      ? "bg-red-500/20 text-red-300 border-red-500/30"
      : category === "ad_network"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : category === "first_party"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : "bg-slate-500/20 text-slate-300 border-slate-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
      <div className="relative w-full max-w-md rounded-2xl radar-panel p-6 shadow-2xl shadow-black space-y-5 border border-cyan-500/30">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 shadow-[0_0_12px_rgba(248,113,113,0.2)]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight font-hud">
              BLOCK DOMAIN
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Add domain to local DNS firewall
            </p>
          </div>
        </div>

        {/* Target Domain Summary */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500">TARGET DOMAIN</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${categoryColor}`}>
              {category}
            </span>
          </div>
          <p className="font-bold text-sm text-cyan-300 truncate">{domain}</p>
        </div>

        {/* First Party Warning Guardrail */}
        {isFirstParty && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 font-sans">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">First-Party Domain Warning</p>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Blocking this domain might break core functionality or login for apps using it.
              </p>
            </div>
          </div>
        )}

        {/* Mode Info Notice */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 space-y-1 font-sans">
          <div className="flex items-center gap-1.5 font-medium text-slate-300 font-hud">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isTestMode ? "Simulated Test Mode" : "Live Hosts File Mode"}</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {isTestMode
              ? "This action will be simulated and marked in the radar stream without editing your system hosts file."
              : `This domain will be mapped to 0.0.0.0 in your OS hosts file (${status?.hosts_path || "hosts"}).`}
          </p>
        </div>

        {/* Optional Reason Input */}
        <div className="space-y-1">
          <label className="block text-[10px] uppercase font-bold text-slate-400 font-sans">
            Reason / Custom Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Telemetry beacon from third party"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#090d16]/80 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono placeholder:text-slate-600"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-sans">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:text-white text-xs font-bold font-mono transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirmBlock}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold font-mono transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(248,113,113,0.2)]"
          >
            {loading ? "BLOCKING..." : "CONFIRM BLOCK"}
          </button>
        </div>
      </div>
    </div>
  );
};
