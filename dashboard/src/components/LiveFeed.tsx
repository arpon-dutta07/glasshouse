"use client";

import React, { useEffect, useRef, useState } from "react";
import { Radio, Filter, Pause, Play, Ban, ShieldAlert, Shield, Info, Terminal, ChevronRight } from "lucide-react";
import {
  ConnectionEvent,
  createLiveWebSocket,
  fetchConnections,
  fetchBlockingStatus,
  fetchBlockedDomains,
  BlockingStatus,
  addCustomRule,
} from "@/lib/api";
import { CategoryLegend } from "./CategoryLegend";
import { BlockModal } from "./BlockModal";
import { DomainDetailModal } from "./DomainDetailModal";

const categoryConfig: Record<string, { dot: string; label: string; text: string; bg: string }> = {
  tracker: { dot: "bg-red-400", label: "TRACKER", text: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  ad_network: { dot: "bg-amber-400", label: "AD_NETWORK", text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  malicious: {
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] ring-1 ring-rose-400",
    label: "MALICIOUS",
    text: "text-rose-400 font-bold",
    bg: "bg-rose-500/15 border-rose-500/30",
  },
  first_party: { dot: "bg-emerald-400", label: "1ST_PARTY", text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  unknown: { dot: "bg-slate-500", label: "UNKNOWN", text: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
};

interface LiveFeedProps {
  onEventsUpdate?: (events: ConnectionEvent[]) => void;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({ onEventsUpdate }) => {
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [blockingStatus, setBlockingStatus] = useState<BlockingStatus | null>(null);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());

  // Modal states
  const [blockModalDomain, setBlockModalDomain] = useState<{ domain: string; category: string } | null>(null);
  const [detailDomain, setDetailDomain] = useState<{ domain: string; category: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isUserScrolled, setIsUserScrolled] = useState<boolean>(false);

  const loadInitialData = async () => {
    const [conns, status, blocked] = await Promise.all([
      fetchConnections({ limit: 40 }),
      fetchBlockingStatus(),
      fetchBlockedDomains(),
    ]);
    setEvents(conns);
    onEventsUpdate?.(conns);
    setBlockingStatus(status);
    setBlockedSet(new Set(blocked.map((b) => b.domain.toLowerCase())));
  };

  useEffect(() => {
    loadInitialData();

    const ws = createLiveWebSocket((newEvent) => {
      if (!isPaused) {
        setEvents((prev) => {
          const updated = [newEvent, ...prev.slice(0, 120)];
          onEventsUpdate?.(updated);
          return updated;
        });
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
      setNotification(`[BLOCKED] Domain ${blockModalDomain.domain} successfully blocked!`);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleAllowRule = async (domain: string) => {
    const ok = await addCustomRule(domain, "allow", "first_party");
    if (ok) {
      setNotification(`[ALLOW RULE APPLIED] ${domain}`);
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

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop } = scrollRef.current;
    setIsUserScrolled(scrollTop > 40);
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      setIsUserScrolled(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "threats") return ev.classification === "malicious";
    if (filter === "trackers") return ev.classification === "tracker" || ev.classification === "ad_network";
    return ev.classification === filter;
  });

  return (
    <div className="rounded-2xl radar-panel p-5 flex flex-col h-[650px] relative font-mono">
      {/* Terminal Bar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2 pl-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 tracking-wider">
              TERMINAL LIVE RADAR FEED
            </span>
            <span className="text-[10px] text-cyan-400/70 hidden sm:inline">
              [glasshouse@radar:~$ sni-stream]
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUserScrolled && (
            <button
              onClick={scrollToTop}
              className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] animate-pulse"
            >
              ↑ Newest
            </button>
          )}

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              isPaused
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:bg-white/[0.06]"
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? "RESUME" : "PAUSE"}</span>
          </button>
        </div>
      </div>

      {/* Monospace Filter Tabs & Category Legend */}
      <div className="flex items-center justify-between gap-2 py-2.5 border-b border-white/[0.04] text-[11px]">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="w-3 h-3 text-slate-500 mr-1 flex-shrink-0" />
          {[
            { id: "all", label: "ALL" },
            { id: "threats", label: "THREATS" },
            { id: "trackers", label: "TRACKERS & ADS" },
            { id: "first_party", label: "FIRST PARTY" },
            { id: "unknown", label: "UNKNOWN" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider transition-all whitespace-nowrap ${
                filter === tab.id
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <CategoryLegend />
      </div>

      {/* Action Notification */}
      {notification && (
        <div className="my-2 py-1 px-3 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] text-center font-mono animate-count">
          {notification}
        </div>
      )}

      {/* Paused Banner */}
      {isPaused && (
        <div className="py-1 px-3 mb-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center gap-1.5">
          <Pause className="w-3 h-3" />
          <span>FEED PAUSED — CAPTURED EVENTS QUEUED IN BUFFER</span>
        </div>
      )}

      {/* Terminal Log Stream Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto divide-y divide-white/[0.03] pr-1 space-y-1 mt-1 font-mono text-[11px]"
      >
        {filteredEvents.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            <span className="text-cyan-400/60">[RADAR STANDBY]</span> Waiting for TLS ClientHello packets...
          </div>
        ) : (
          filteredEvents.map((ev, idx) => {
            const cat = categoryConfig[ev.classification] || categoryConfig.unknown;
            const isBlocked = isDomainBlocked(ev.sni_domain);
            const timeStr = new Date(ev.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <div
                key={ev.id || `${ev.sni_domain}-${idx}`}
                className="terminal-line-enter py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
              >
                {/* Terminal Log Content */}
                <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                  <span className="text-slate-500 text-[10px] flex-shrink-0">
                    [{timeStr}]
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border flex-shrink-0 ${cat.bg} ${cat.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                    {cat.label}
                  </span>

                  <button
                    onClick={() => setDetailDomain({ domain: ev.sni_domain, category: ev.classification })}
                    className="font-semibold text-slate-100 hover:text-cyan-300 truncate text-left transition-colors cursor-pointer group-hover:underline"
                    title="Click for domain telemetry & WHOIS intel"
                  >
                    {ev.sni_domain}
                  </button>

                  <span className="text-slate-600 text-[10px] hidden md:inline">
                    → {ev.destination_ip || ev.dst_ip || "WAN"}
                  </span>
                </div>

                {/* Right Metadata & Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
                  {ev.threat_vendors && ev.threat_vendors > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[9px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      {ev.threat_vendors} FLAGS
                    </span>
                  ) : null}

                  {isBlocked ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold">
                      BLOCKED
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleAllowRule(ev.sni_domain)}
                        className="px-2 py-0.5 rounded bg-white/[0.03] hover:bg-emerald-500/15 hover:text-emerald-300 text-slate-400 border border-white/[0.06] text-[9px] transition-all"
                        title="Allow domain override"
                      >
                        [ALLOW]
                      </button>
                      <button
                        onClick={() => setBlockModalDomain({ domain: ev.sni_domain, category: ev.classification })}
                        className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-[9px] font-bold transition-all shadow-[0_0_6px_rgba(244,63,94,0.1)]"
                        title="Block domain"
                      >
                        [BLOCK]
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Domain Intel Modal */}
      {detailDomain && (
        <DomainDetailModal
          domain={detailDomain.domain}
          category={detailDomain.category}
          onClose={() => setDetailDomain(null)}
          onBlockRequest={(dom, cat) => {
            setDetailDomain(null);
            setBlockModalDomain({ domain: dom, category: cat });
          }}
        />
      )}

      {/* Block Confirmation Modal */}
      {blockModalDomain && (
        <BlockModal
          domain={blockModalDomain.domain}
          category={blockModalDomain.category}
          status={blockingStatus}
          onClose={() => setBlockModalDomain(null)}
          onBlocked={handleDomainBlocked}
        />
      )}
    </div>
  );
};
