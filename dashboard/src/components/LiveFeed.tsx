"use client";

import React, { useEffect, useState } from "react";
import { Radio, Filter, Pause, Play, Ban } from "lucide-react";
import { ConnectionEvent, createLiveWebSocket, fetchRecentConnections, addCustomRule } from "@/lib/api";

const categoryConfig: Record<string, { dot: string; label: string }> = {
  tracker: { dot: "bg-red-400", label: "Tracker" },
  ad_network: { dot: "bg-amber-400", label: "Ad Network" },
  first_party: { dot: "bg-emerald-400", label: "First Party" },
  unknown: { dot: "bg-slate-500", label: "Unknown" },
};

export const LiveFeed: React.FC = () => {
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentConnections(40).then((data) => {
      setEvents(data);
    });

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
      setNotification(`Blocked: ${domain}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "trackers") return ev.classification === "tracker" || ev.classification === "ad_network";
    return ev.classification === filter;
  });

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 flex flex-col h-[640px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div>
            <h2 className="font-medium text-[14px] text-slate-200">Live Feed</h2>
            <p className="text-[11px] text-slate-600">TLS handshake stream</p>
          </div>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            isPaused
              ? "bg-amber-500/10 text-amber-400"
              : "bg-white/[0.04] text-slate-500 hover:text-slate-300"
          }`}
        >
          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          {isPaused ? "Resume" : "Pause"}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 pb-3 border-b border-white/[0.04] text-[11px]">
        <Filter className="w-3 h-3 text-slate-600 mr-1" />
        {[
          { id: "all", label: "All" },
          { id: "trackers", label: "Trackers" },
          { id: "first_party", label: "Benign" },
          { id: "unknown", label: "Unknown" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              filter === tab.id
                ? "bg-white/[0.08] text-white"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notification && (
        <div className="my-2 py-1.5 px-3 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] text-center">
          {notification}
        </div>
      )}

      {/* Stream */}
      <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-700 text-[12px]">
            Waiting for TLS handshakes...
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredEvents.map((ev, idx) => {
              const config = categoryConfig[ev.classification] || categoryConfig.unknown;
              const formattedTime = new Date(ev.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const isNew = idx < 3;

              return (
                <div
                  key={ev.id || `${ev.sni_domain}-${idx}`}
                  className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors ${
                    isNew ? "feed-row-enter" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
                    <span className="font-mono text-[12px] text-slate-300 truncate">
                      {ev.sni_domain}
                    </span>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">
                      {config.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-slate-700">
                      {formattedTime}
                    </span>
                    {ev.classification === "unknown" && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleQuickBlock(ev.sni_domain);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-slate-600 transition-all"
                        title="Block"
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
