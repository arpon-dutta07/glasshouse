"use client";

import React, { useEffect, useState } from "react";
import { Radio, Filter, Pause, Play, Ban, ShieldAlert, Shield, Info, Sparkles } from "lucide-react";
import {
  ConnectionEvent,
  createLiveWebSocket,
  fetchConnections,
  fetchBlockingStatus,
  fetchBlockedDomains,
  BlockingStatus,
} from "@/lib/api";
import { CategoryLegend } from "./CategoryLegend";
import { BlockModal } from "./BlockModal";
import { DomainDetailModal } from "./DomainDetailModal";

const categoryConfig: Record<string, { dot: string; label: string; text: string }> = {
  tracker: { dot: "bg-red-400", label: "Tracker", text: "text-red-400" },
  ad_network: { dot: "bg-amber-400", label: "Ad Network", text: "text-amber-400" },
  malicious: {
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] ring-1 ring-rose-400",
    label: "Malicious",
    text: "text-rose-400 font-semibold",
  },
  first_party: { dot: "bg-emerald-400", label: "First Party", text: "text-emerald-400" },
  unknown: { dot: "bg-slate-500", label: "Unclassified", text: "text-slate-400" },
};

export const LiveFeed: React.FC = () => {
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [blockingStatus, setBlockingStatus] = useState<BlockingStatus | null>(null);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());

  // Modal states
  const [blockModalDomain, setBlockModalDomain] = useState<{ domain: string; category: string } | null>(null);
  const [detailDomain, setDetailDomain] = useState<{ domain: string; category: string } | null>(null);

  const loadInitialData = async () => {
    const [conns, status, blocked] = await Promise.all([
      fetchConnections({ limit: 40 }),
      fetchBlockingStatus(),
      fetchBlockedDomains(),
    ]);
    setEvents(conns);
    setBlockingStatus(status);
    setBlockedSet(new Set(blocked.map((b) => b.domain.toLowerCase())));
  };

  useEffect(() => {
    loadInitialData();

    const ws = createLiveWebSocket((newEvent) => {
      if (!isPaused) {
        setEvents((prev) => [newEvent, ...prev.slice(0, 100)]);
      }
    });

    const interval = setInterval(() => {
      fetchBlockedDomains().then((blocked) => {
        setBlockedSet(new Set(blocked.map((b) => b.domain.toLowerCase())));
      });
    }, 15000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [isPaused]);

  const handleDomainBlocked = () => {
    if (blockModalDomain) {
      setBlockedSet((prev) => new Set([...prev, blockModalDomain.domain.toLowerCase()]));
      setNotification(`Domain ${blockModalDomain.domain} blocked!`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const isDomainBlocked = (dom: string) => {
    const d = dom.toLowerCase().trim();
    if (blockedSet.has(d)) return true;
    for (const b of Array.from(blockedSet)) {
      if (d.endsWith("." + b)) return true;
    }
    return false;
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "threats") return ev.classification === "malicious";
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
            <h2 className="font-medium text-[14px] text-slate-200">Live Traffic Feed</h2>
            <p className="text-[11px] text-slate-600">Real-time inspected TLS handshakes</p>
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

      {/* Filter Tabs & Legend */}
      <div className="flex items-center justify-between gap-1 pb-3 border-b border-white/[0.04] text-[11px]">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="w-3 h-3 text-slate-600 mr-1 flex-shrink-0" />
          {[
            { id: "all", label: "All" },
            { id: "threats", label: "Threats" },
            { id: "trackers", label: "Trackers & Ads" },
            { id: "first_party", label: "First Party" },
            { id: "unknown", label: "Unclassified" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-all whitespace-nowrap ${
                filter === tab.id
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <CategoryLegend />
      </div>

      {notification && (
        <div className="my-2 py-1.5 px-3 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] text-center font-mono animate-count">
          {notification}
        </div>
      )}

      {/* Stream */}
      <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-700 text-[12px] font-mono">
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
              const blocked = isDomainBlocked(ev.sni_domain);

              return (
                <div
                  key={ev.id || `${ev.sni_domain}-${idx}`}
                  className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors ${
                    isNew ? "feed-row-enter" : ""
                  }`}
                >
                  {/* Domain & Dot */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`} />
                    <button
                      onClick={() => setDetailDomain({ domain: ev.sni_domain, category: ev.classification })}
                      className="font-mono text-[12px] text-slate-300 hover:text-cyan-300 truncate text-left transition-colors cursor-pointer"
                      title="Inspect domain enrichment & threat report"
                    >
                      {ev.sni_domain}
                    </button>
                    {blocked && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-red-500/20 text-red-300 border border-red-500/30 flex-shrink-0 font-medium">
                        Blocked
                      </span>
                    )}
                    <span className={`text-[10px] flex-shrink-0 capitalize ${config.text}`}>
                      {config.label}
                    </span>
                  </div>

                  {/* Right side: Device & Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-[10px] text-slate-600 hidden sm:inline">
                      {ev.device_name || ev.src_ip || "host"}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">
                      {formattedTime}
                    </span>

                    {/* Block / Shield Button */}
                    {!blocked && (
                      <button
                        onClick={() =>
                          setBlockModalDomain({
                            domain: ev.sni_domain,
                            category: ev.classification,
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-all"
                        title="Block this domain"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block Confirmation Modal */}
      {blockModalDomain && (
        <BlockModal
          domain={blockModalDomain.domain}
          category={blockModalDomain.category}
          status={blockingStatus}
          isOpen={true}
          onClose={() => setBlockModalDomain(null)}
          onBlocked={handleDomainBlocked}
        />
      )}

      {/* Domain Detail & Enrichment Modal */}
      {detailDomain && (
        <DomainDetailModal
          domain={detailDomain.domain}
          category={detailDomain.category}
          isOpen={true}
          onClose={() => setDetailDomain(null)}
          onBlockRequested={(dom, cat) => {
            setBlockModalDomain({ domain: dom, category: cat });
          }}
        />
      )}
    </div>
  );
};
