"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, X, ShieldAlert, BookOpen } from "lucide-react";

export const CategoryLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const categories = [
    {
      label: "First Party",
      dot: "bg-emerald-500",
      description: "Direct connection from the app or site to its own core servers (e.g. loading page content, auth). Expected behavior.",
    },
    {
      label: "Tracker",
      dot: "bg-red-500",
      description:
        "Analytics and user-behavior measurement services that log your interactions and telemetry behind the scenes.",
    },
    {
      label: "Ad Network",
      dot: "bg-amber-500",
      description:
        "Advertising SDKs and bidding exchanges that deliver targeted promotions across websites and software.",
    },
    {
      label: "Flagged Threat",
      dot: "bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)] ring-2 ring-rose-400",
      description:
        "Identified by threat intelligence databases (URLhaus / VirusTotal) as malicious infrastructure, malware, or phishing.",
    },
    {
      label: "Unclassified",
      dot: "bg-slate-400",
      description:
        "New or uncataloged domain. Glasshouse uses fallback signals (WHOIS age, TLS cert organization, and cloud provider) to offer context.",
    },
  ];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
        aria-label="Category explanation guide"
        title="What do these categories mean?"
      >
        <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>Legend & Guide</span>
      </button>

      {/* Popover — opens upward so it doesn't get clipped by the scrollable list below */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-80 sm:w-96 z-[100] rounded-2xl glass-card bg-white/95 dark:bg-[#10131e]/95 border border-slate-200/80 dark:border-white/[0.1] p-5 shadow-2xl shadow-black/20 dark:shadow-black/60 backdrop-blur-2xl animate-count font-sans">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Classification Guide
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                How Glasshouse categorizes outbound network connections
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-3.5 pt-3.5 max-h-[320px] overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.label} className="text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cat.dot}`} />
                  <span className="font-bold text-slate-900 dark:text-slate-200">{cat.label}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-4.5 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
