"use client";

import React, { useEffect, useState } from "react";
import {
  Globe,
  Server,
  Shield,
  ShieldAlert,
  Calendar,
  Lock,
  X,
  ExternalLink,
  Ban,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { DomainEnrichment, fetchDomainEnrichment } from "@/lib/api";

interface DomainDetailModalProps {
  domain: string;
  category?: string;
  isOpen: boolean;
  onClose: () => void;
  onBlockRequested?: (domain: string, category: string) => void;
}

export const DomainDetailModal: React.FC<DomainDetailModalProps> = ({
  domain,
  category = "unknown",
  isOpen,
  onClose,
  onBlockRequested,
}) => {
  const [enrichment, setEnrichment] = useState<DomainEnrichment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && domain) {
      setLoading(true);
      fetchDomainEnrichment(domain).then((data) => {
        setEnrichment(data);
        setLoading(false);
      });
    }
  }, [isOpen, domain]);

  if (!isOpen) return null;

  const isMalicious = category === "malicious" || (enrichment?.threat_vendors ?? 0) >= 3;
  const isNewDomain = enrichment?.is_newly_registered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e0e17] border border-white/[0.08] p-6 shadow-2xl shadow-black space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isMalicious
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-cyan-500/10 text-cyan-400"
              }`}
            >
              {isMalicious ? <ShieldAlert className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{domain}</h3>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {enrichment?.ip_address ? `IP: ${enrichment.ip_address}` : "Multi-layer inspection"}
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

        {/* Loading State */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-400">Gathering WHOIS, TLS Cert & Threat Intel...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Descriptive Reputation Summary */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reputation & Context Analysis</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                {enrichment?.summary_label || "No additional threat or registration records available."}
              </p>
            </div>

            {/* Signal Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Signal 1: Threat Intelligence */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-medium text-slate-500 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-slate-400" /> Threat Intel
                  </span>
                  {(enrichment?.threat_vendors ?? 0) > 0 ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                      {enrichment?.threat_vendors} Flags
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Clean
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 font-medium truncate">
                  {enrichment?.threat_source || "URLhaus / VirusTotal"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {enrichment?.threat_details || "No malicious payload distribution detected"}
                </p>
              </div>

              {/* Signal 2: WHOIS Registration Age */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Registration
                  </span>
                  {isNewDomain ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                      Young (&lt;30d)
                    </span>
                  ) : enrichment?.created_year ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                      Est. {enrichment.created_year}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-600">Unknown</span>
                  )}
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  {enrichment?.age_days ? `${enrichment.age_days.toLocaleString()} days old` : "Private / Unlisted"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isNewDomain ? "Young domain (<30 days) — mild risk signal" : "Domain age verified via RDAP"}
                </p>
              </div>

              {/* Signal 3: TLS Certificate Organization */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-medium text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> TLS Cert Org (O)
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium truncate">
                  {enrichment?.cert_org || "Not specified in cert"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {enrichment?.cert_org ? "Extracted from verified X.509 cert" : "Standard Domain Validated (DV) cert"}
                </p>
              </div>

              {/* Signal 4: Hosting Provider / Cloud Network */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-medium text-slate-500 flex items-center gap-1">
                    <Server className="w-3 h-3 text-slate-400" /> Host / Network
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium truncate">
                  {enrichment?.hosting_provider || "Unrecognized host"}
                </p>
                <p className="text-[11px] text-slate-500">Cloud network / ASN resolution</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <span className="text-[11px] text-slate-500 font-mono">
            Category: <strong className="text-slate-300 capitalize">{category.replace(/_/g, " ")}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors"
            >
              Close
            </button>
            {onBlockRequested && (
              <button
                onClick={() => {
                  onClose();
                  onBlockRequested(domain, category);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Block Domain
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
