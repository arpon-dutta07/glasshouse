"use client";

import React, { useState } from "react";
import { Info, Terminal, ExternalLink, ChevronDown, ChevronUp, X, Check, Copy } from "lucide-react";

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
      title: "Install Packet Capture Driver (Windows)",
      detail: "Download and install Npcap from npcap.com. Ensure 'WinPcap API-compatible Mode' is checked during installation.",
      command: null,
    },
    {
      step: 2,
      title: "Clone the Repository",
      detail: "Clone the Glasshouse source code to your local machine.",
      command: "git clone https://github.com/arpon-dutta07/glasshouse.git\ncd glasshouse",
    },
    {
      step: 3,
      title: "Install Dependencies",
      detail: "Set up Python dependencies and dashboard packages.",
      command: "pip install -r requirements.txt\ncd dashboard && npm install && cd ..",
    },
    {
      step: 4,
      title: "Start Backend (as Administrator)",
      detail: "Open an elevated Administrator terminal so raw packet sniffing permissions are granted.",
      command: "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000",
    },
    {
      step: 5,
      title: "Launch Dashboard",
      detail: "In a second terminal, start the Next.js frontend and open in your browser.",
      command: "cd dashboard && npm run dev",
    },
  ];

  return (
    <div className="rounded-2xl bg-cyan-950/20 border border-cyan-500/20 p-5 text-xs">
      <div className="flex items-start justify-between gap-4">
        {/* Left icon + text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-[13px] tracking-tight">
                Local Network Monitoring & Deployment
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase">
                Privacy Architecture
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[12px]">
              Glasshouse only monitors <span className="text-white font-medium">YOUR own local network traffic</span> when
              its backend is running on your machine — it cannot and does not monitor anything remotely. This hosted
              version is a demo with sample data. To monitor your own network, clone the repo and follow the local
              setup guide (requires Npcap on Windows).
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-medium text-xs transition-all cursor-pointer shadow-sm shadow-cyan-950/50"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Run on your own network</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
            title="Dismiss notice"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Step-by-Step Setup Guide */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-cyan-500/20 space-y-4 animate-count">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-semibold text-white">
              Step-by-Step Local Deployment Guide
            </h4>
            <a
              href="https://github.com/arpon-dutta07/glasshouse"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>GitHub README</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                    <span className="font-medium text-slate-200 text-xs">{s.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pl-7">{s.detail}</p>
                </div>

                {s.command && (
                  <div className="relative mt-2 pl-7">
                    <pre className="p-2.5 rounded-lg bg-black/70 border border-white/[0.08] text-[11px] font-mono text-cyan-300/90 overflow-x-auto whitespace-pre">
                      {s.command}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(s.command!, s.step)}
                      className="absolute right-2 top-2 p-1 rounded bg-white/[0.08] hover:bg-white/[0.15] text-slate-300 transition-colors"
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
        </div>
      )}
    </div>
  );
};
