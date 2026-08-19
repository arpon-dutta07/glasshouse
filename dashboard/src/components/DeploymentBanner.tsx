"use client";

import React, { useState } from "react";
import { AlertTriangle, Terminal, ExternalLink, ChevronDown, ChevronUp, X, Check, Copy, Shield, Download } from "lucide-react";

export const DeploymentBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  if (isDismissed) return null;

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const steps = [
    {
      step: 1,
      title: "Download & Install Npcap (Windows Driver)",
      detail: "Npcap is a free Windows packet capture driver that allows Glasshouse to inspect local TLS handshakes. Ensure you check 'Install Npcap in WinPcap API-compatible Mode' during setup.",
      linkText: "Download Npcap for Windows",
      linkUrl: "https://npcap.com/#download",
      command: null,
    },
    {
      step: 2,
      title: "Clone the Glasshouse Repository",
      detail: "Clone the source repository to your computer from GitHub.",
      linkText: "View GitHub Repository",
      linkUrl: "https://github.com/arpon-dutta07/glasshouse",
      command: "git clone https://github.com/arpon-dutta07/glasshouse.git\ncd glasshouse",
    },
    {
      step: 3,
      title: "Install Dependencies",
      detail: "Install Python backend requirements and Next.js frontend packages.",
      command: "pip install -r requirements.txt\ncd dashboard && npm install && cd ..",
    },
    {
      step: 4,
      title: "Run Backend as Administrator",
      detail: "Raw socket and network adapter inspection requires elevated Administrator privileges.",
      command: "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000",
    },
    {
      step: 5,
      title: "Launch Dashboard",
      detail: "Start the Next.js radar dashboard in a terminal and open in your browser.",
      command: "cd dashboard && npm run dev",
    },
  ];

  return (
    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/25 border-2 border-amber-600/80 dark:border-amber-500/40 p-5 text-xs shadow-md font-sans">
      <div className="flex items-start justify-between gap-4">
        {/* Left Warning Icon + Core Explainer */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 dark:bg-amber-500/20 border border-amber-600/40 dark:border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-amber-950 dark:text-amber-200 text-sm tracking-tight flex items-center gap-1.5 font-hud">
                ⚠ BEFORE YOU START — READ THIS
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-500/40 uppercase">
                IMPORTANT SETUP NOTICE
              </span>
            </div>

            <p className="text-slate-900 dark:text-slate-200 leading-relaxed text-[12.5px] font-medium">
              This dashboard is running a <strong className="text-black dark:text-white font-bold">live inspection demo</strong>. Glasshouse only ever monitors <strong className="text-amber-900 dark:text-amber-300 font-bold">YOUR OWN local network traffic</strong> when its backend runs on your machine — it cannot and never will monitor anything remotely.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
              <a
                href="https://npcap.com/#download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-300 hover:text-black dark:hover:text-amber-100 underline font-mono"
              >
                <Download className="w-3.5 h-3.5" />
                <span>1. Download Npcap Driver (npcap.com)</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <span className="text-slate-400 hidden sm:inline">•</span>

              <a
                href="https://github.com/arpon-dutta07/glasshouse"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-300 hover:text-black dark:hover:text-white underline font-mono"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>2. View GitHub Setup Guide</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-200/90 dark:bg-amber-500/20 hover:bg-amber-300 dark:hover:bg-amber-500/30 border border-amber-600/40 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 font-bold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Setup Instructions</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.05] transition-colors"
            title="Dismiss notice for this session"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Step-by-Step Guide */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-amber-400/40 dark:border-amber-500/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map((s) => (
              <div
                key={s.step}
                className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-amber-400/50 dark:border-amber-500/20 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white font-hud text-xs">
                    Step {s.step}: {s.title}
                  </span>
                  {s.linkUrl && (
                    <a
                      href={s.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10.5px] font-mono font-bold text-amber-900 dark:text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <span>{s.linkText}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <p className="text-[11.5px] text-slate-800 dark:text-slate-300 leading-relaxed font-medium">
                  {s.detail}
                </p>

                {s.command && (
                  <div className="relative group mt-1">
                    <pre className="p-2 rounded-lg bg-slate-900 text-cyan-300 font-mono text-[10.5px] overflow-x-auto border border-slate-800">
                      {s.command}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(s.command!, s.step)}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy command"
                    >
                      {copiedStep === s.step ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-[11px] text-slate-900 dark:text-slate-300 flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-amber-700 dark:text-amber-500 flex-shrink-0" />
            <span>
              <strong>Note:</strong> On Windows, Npcap enables zero-decryption SNI capture. On Linux/macOS, standard libpcap drivers work natively.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
