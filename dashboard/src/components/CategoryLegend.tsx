"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, X } from "lucide-react";

export const CategoryLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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
      dot: "bg-emerald-400",
      description: "This is the app talking to its own server — normal, expected traffic.",
    },
    {
      label: "Tracker",
      dot: "bg-red-400",
      description:
        "This company logs your activity — what you use, when, and how often — usually to build a profile of your habits and interests for ads or analytics. It's not an attack or a virus, but it does mean your behavior is being recorded without a clear, obvious opt-in. Worth knowing about.",
    },
    {
      label: "Ad Network",
      dot: "bg-amber-400",
      description:
        "This company shows you targeted ads based on your activity, often combined with data from many other apps you use.",
    },
    {
      label: "Unknown",
      dot: "bg-slate-500",
      description:
        "We haven't classified this domain yet. Could be first-party, could be a tracker — not enough information to say either way.",
    },
  ];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all cursor-pointer"
        aria-label="Category explanation guide"
        title="What do these categories mean?"
      >
        <HelpCircle className="w-3 h-3 text-cyan-400" />
        <span>Guide</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 rounded-xl bg-[#0c0c14] border border-white/[0.08] p-4 shadow-2xl shadow-black/80 backdrop-blur-xl animate-count">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight">
                Traffic Classification Guide
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Trackers usually aren't dangerous by themselves — but they quietly build a picture
                of your habits across apps. This dashboard just makes that visible, so you can decide
                what's okay and what's not.
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-3 pt-3">
            {categories.map((cat) => (
              <div key={cat.label} className="text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`} />
                  <span className="font-semibold text-slate-200 text-[11px]">{cat.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 pl-4 leading-relaxed font-normal">
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
