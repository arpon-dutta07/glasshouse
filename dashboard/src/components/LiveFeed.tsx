"use client";

import React, { useEffect, useState } from "react";
import { Radio, ShieldAlert, ShieldCheck, HelpCircle, Ban, Filter, Pause, Play } from "lucide-react";
import { ConnectionEvent, createLiveWebSocket, fetchRecentConnections, addCustomRule } from "@/lib/api";

export const LiveFeed: React.FC = () => {
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchRecentConnections(40).then((data) => {
      setEvents(data);
    });

    // WebSocket listener
    const ws = createLiveWebSocket((newEvent) => {
      if (!isPaused) {
        setEvents((prev) => [newEvent, ...prev.slice(0, 100)]);
      }
    });

    return () => {
      ws.close();
    };
  }, [isPaused]);

  const handleQuickBlock = async (domain: string) => {
    const ok = await addCustomRule(domain, "block", "tracker");
    if (ok) {
      setNotification(`Blocked rule added for: ${domain}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "tracker":
        return {
          bg: "bg-rose-950/70 border-rose-800/80 text-rose-300",
          icon: ShieldAlert,
          label: "TRACKER",
        };
      case "ad_network":
        return {
          bg: "bg-amber-950/70 border-amber-800/80 text-amber-300",
          icon: ShieldAlert,
          label: "AD NETWORK",
        };
      case "first_party":
        return {
          bg: "bg-emerald-950/70 border-emerald-800/80 text-emerald-300",
          icon: ShieldCheck,
          label: "FIRST PARTY",
        };
      default:
        return {
          bg: "bg-slate-800/70 border-slate-700/80 text-slate-300",
          icon: HelpCircle,
          label: "UNKNOWN",
        };
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "trackers") return ev.classification === "tracker" || ev.classification === "ad_network";
    return ev.classification === filter;
  });

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col h-[640px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-sm">Live Connection Radar</h2>
            <p className="text-[11px] text-slate-400">Real-time passive TLS ClientHello SNI stream</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isPaused
                ? "bg-amber-950/60 border-amber-700 text-amber-300"
                : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700/60"
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 py-3 border-b border-slate-800/60 text-xs overflow-x-auto">
        <span className="text-slate-400 text-[11px] flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        {[
          { id: "all", label: "All Traffic" },
          { id: "trackers", label: "Trackers & Ads" },
          { id: "first_party", label: "First Party" },
          { id: "unknown", label: "Unknown" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === tab.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notification && (
        <div className="my-2 p-2 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-200 text-xs font-mono text-center">
          {notification}
        </div>
      )}

      {/* Connection Stream List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-3">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
            <span>Listening for outbound TLS handshakes on port 443...</span>
          </div>
        ) : (
          filteredEvents.map((ev, idx) => {
            const badge = getCategoryBadge(ev.classification);
            const BadgeIcon = badge.icon;
            const formattedTime = new Date(ev.timestamp).toLocaleTimeString();

            return (
              <div
                key={ev.id || `${ev.sni_domain}-${idx}`}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/90 transition-all flex items-center justify-between gap-3 text-xs"
              >
                {/* Domain & Source info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-slate-200 truncate">{ev.sni_domain}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.bg}`}
                    >
                      <BadgeIcon className="w-2.5 h-2.5" />
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                    <span>Src: {ev.src_ip || ev.device_mac || "Local Host"}</span>
                    <span>•</span>
                    <span>{formattedTime}</span>
                  </div>
                </div>

                {/* Quick actions */}
                {ev.classification === "unknown" && (
                  <button
                    onClick={() => handleQuickBlock(ev.sni_domain)}
                    className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-rose-500/50 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Block this domain"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
