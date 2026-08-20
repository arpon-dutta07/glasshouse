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
  CheckCircle2,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md font-sans">
      <div className="relative w-full max-w-lg rounded-3xl glass-card bg-white/95 dark:bg-[#10131e]/95 p-6 sm:p-7 shadow-2xl shadow-black/20 dark:shadow-black/70 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200/80 dark:border-white/[0.08]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${
                isMalicious
                  ? "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400"
                  : "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
              }`}
            >
              {isMalicious ? <ShieldAlert className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Domain Intelligence Profile
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading break-all">
                {domain}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Warning Alert */}
        {isMalicious && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900 dark:text-rose-200">Flagged Threat Alert</p>
              <p className="text-rose-700 dark:text-rose-300/80 leading-relaxed">
                {enrichment?.threat_details ||
                  `Domain flagged by ${enrichment?.threat_vendors || "multiple"} security vendors as suspicious or malicious.`}
              </p>
            </div>
          </div>
        )}

        {/* Newly Registered Domain Warning */}
        {isNewDomain && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Newly Registered Domain</p>
              <p className="text-amber-700 dark:text-amber-300/80 leading-relaxed">
                Domain registered recently (less than 90 days ago). Higher probability of ephemeral ad / tracking infrastructure.
              </p>
            </div>
          </div>
        )}

        {/* Quick Intel Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.05] space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Domain Age
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {loading
                ? "Checking WHOIS..."
                : enrichment?.created_year
                ? `Est. ${enrichment.created_year} (${enrichment.age_days ?? "?"} days)`
                : "Unknown / Privacy Protected"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.05] space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Infrastructure Host
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {loading ? "Resolving ASN..." : enrichment?.hosting_provider || "Cloudflare / CDN"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.05] space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> TLS Certificate
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {loading ? "Inspecting certificate..." : enrichment?.cert_org || "Let's Encrypt / DigiCert"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.05] space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Threat Status
            </span>
            <p className="text-sm font-bold">
              {enrichment?.threat_vendors && enrichment.threat_vendors > 0 ? (
                <span className="text-rose-600 dark:text-rose-400">{enrichment.threat_vendors} Vendor Flags</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clean (0 Flags)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-white/[0.06]">
          <a
            href={`https://www.virustotal.com/gui/domain/${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <span>VirusTotal Analysis</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            {(onBlockRequest || onBlockRequested) && (
              <button
                onClick={handleBlock}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-rose-500/20"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block Domain</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
