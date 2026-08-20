"use client";

import React, { useState } from "react";
import { Terminal, ExternalLink, ChevronDown, ChevronUp, X, Check, Copy, Shield, Download, Sparkles, HelpCircle } from "lucide-react";

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
      title: "Download & Install Npcap",
      detail: "Free Windows packet capture driver. Enable 'Install Npcap in WinPcap API-compatible Mode' during setup.",
      linkText: "Download Npcap",
      linkUrl: "https://npcap.com/#download",
      command: null,
    },
    {
      step: 2,
      title: "Clone Repository",
      detail: "Clone the source repository to your machine.",
      command: "git clone https://github.com/arpon-dutta07/glasshouse.git\ncd glasshouse",
    },
    {
      step: 3,
      title: "Install Dependencies",
      detail: "Install Python backend requirements & frontend packages.",
      command: "pip install -r requirements.txt\ncd dashboard && npm install && cd ..",
    },
    {
      step: 4,
      title: "Run Backend as Admin",
      detail: "Raw socket inspection requires elevated permissions.",
      command: "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000",
    },
    {
      step: 5,
      title: "Launch Dashboard",
      detail: "Start the Next.js frontend in your terminal.",
      command: "cd dashboard && npm run dev",
    },
  ];

  return (
    <div className="rounded-2xl glass-card border border-indigo-200/60 dark:border-indigo-500/20 bg-gradient-to-r from-indigo-500/[0.04] via-purple-500/[0.02] to-transparent p-4 sm:p-5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                Live Local Network Inspection
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                Zero-Decryption SNI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-normal">
              Passively inspecting outbound TLS handshakes on your machine. All traffic stays private and is processed locally.
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <a
            href="https://npcap.com/#download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm shadow-indigo-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Npcap Driver</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Setup Steps</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Step-by-Step Guide */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/[0.06] space-y-4 animate-count">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="p-3.5 rounded-xl bg-white/70 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs text-slate-900 dark:text-white">
                    Step {s.step}: {s.title}
                  </span>
                  {s.linkUrl && (
                    <a
                      href={s.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>Download</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.detail}
                </p>

                {s.command && (
                  <div className="relative group mt-1">
                    <pre className="p-2 rounded-lg bg-slate-900 text-indigo-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
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

          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span>
              <strong>Note:</strong> On Windows, Npcap enables zero-decryption SNI capture. On Linux/macOS, standard libpcap drivers work natively.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
