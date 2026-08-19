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
  Radio,
  Terminal,
} from "lucide-react";
import { DomainEnrichment, fetchDomainEnrichment } from "@/lib/api";

interface DomainDetailModalProps {
  domain: string;
  category?: string;
  isOpen?: boolean;
  onClose: () => void;
  onBlockRequested?: (domain: string, category: string) => void;
  onBlockRequest?: (domain: string, category: string) => void;
}

export const DomainDetailModal: React.FC<DomainDetailModalProps> = ({
  domain,
  category = "unknown",
  isOpen = true,
  onClose,
  onBlockRequested,
  onBlockRequest,
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

  const handleBlock = () => {
    if (onBlockRequest) onBlockRequest(domain, category);
    else if (onBlockRequested) onBlockRequested(domain, category);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
      <div className="relative w-full max-w-lg rounded-2xl radar-panel p-6 shadow-2xl shadow-black space-y-6 max-h-[90vh] overflow-y-auto border border-cyan-500/30">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg ${
                isMalicious
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
              }`}
            >
              {isMalicious ? <ShieldAlert className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                DOMAIN SURVEILLANCE PROFILE
              </span>
              <h3 className="text-base font-bold text-white tracking-tight break-all font-hud">
                {domain}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Warning Alert */}
        {isMalicious && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1 font-sans">
              <p className="font-bold text-rose-200">Flagged Threat Alert</p>
              <p className="text-[11px] text-rose-300/80 leading-relaxed font-mono">
                {enrichment?.threat_details ||
                  `Domain flagged by ${enrichment?.threat_vendors || "multiple"} security vendors as suspicious or malicious.`}
              </p>
            </div>
          </div>
        )}

        {/* Newly Registered Domain Warning */}
        {isNewDomain && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-0.5 font-sans">
              <p className="font-semibold text-amber-200">Newly Registered Domain</p>
              <p className="text-[11px] text-amber-300/80 font-mono">
                Registered less than 90 days ago. High risk of newly deployed tracker / phishing campaign.
              </p>
            </div>
          </div>
        )}

        {/* Quick Intel Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 font-sans">
              <Calendar className="w-3 h-3 text-cyan-400" /> Domain Age
            </span>
            <p className="text-xs font-bold text-slate-100 font-mono">
              {loading
                ? "Checking WHOIS..."
                : enrichment?.created_year
                ? `Est. ${enrichment.created_year} (${enrichment.age_days ?? "?"} days)`
                : "Unknown / Privacy Protected"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 font-sans">
              <Server className="w-3 h-3 text-cyan-400" /> Infrastructure Host
            </span>
            <p className="text-xs font-bold text-slate-100 font-mono truncate">
              {loading ? "Resolving ASN..." : enrichment?.hosting_provider || "Cloudflare / CDN"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 font-sans">
              <Lock className="w-3 h-3 text-cyan-400" /> SSL / TLS Certificate
            </span>
            <p className="text-xs font-bold text-slate-100 font-mono truncate">
              {loading ? "Inspecting cert..." : enrichment?.cert_org || "Let's Encrypt / DigiCert"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 font-sans">
              <Shield className="w-3 h-3 text-cyan-400" /> Threat Status
            </span>
            <p className="text-xs font-bold font-mono">
              {enrichment?.threat_vendors && enrichment.threat_vendors > 0 ? (
                <span className="text-rose-400">{enrichment.threat_vendors} Vendor Flags</span>
              ) : (
                <span className="text-emerald-400">0 Flags (Clean)</span>
              )}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <a
            href={`https://www.virustotal.com/gui/domain/${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors font-mono"
          >
            <span>VirusTotal Report</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              CLOSE
            </button>
            {(onBlockRequest || onBlockRequested) && (
              <button
                onClick={handleBlock}
                className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(248,113,113,0.2)]"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>BLOCK DOMAIN</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
