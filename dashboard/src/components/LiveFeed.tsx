"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Radio, Filter, Pause, Play, Ban, ShieldAlert, Shield, Info, Activity, ChevronRight, Check } from "lucide-react";
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
  tracker: {
    dot: "bg-red-500",
    label: "Tracker",
    text: "text-red-700 dark:text-red-300 font-semibold",
    bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
  },
  ad_network: {
    dot: "bg-amber-500",
    label: "Ad Network",
    text: "text-amber-700 dark:text-amber-300 font-semibold",
    bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  },
  malicious: {
    dot: "bg-rose-500",
    label: "Flagged Threat",
    text: "text-rose-700 dark:text-rose-300 font-bold",
    bg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30",
  },
  first_party: {
    dot: "bg-emerald-500",
    label: "First Party",
    text: "text-emerald-700 dark:text-emerald-300 font-semibold",
    bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  },
  unknown: {
    dot: "bg-slate-400",
    label: "Unclassified",
    text: "text-slate-600 dark:text-slate-400 font-medium",
    bg: "bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20",
  },
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

  // Use refs so WebSocket/interval callbacks always see latest values
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const onEventsUpdateRef = useRef(onEventsUpdate);
  onEventsUpdateRef.current = onEventsUpdate;

  const loadInitialData = useCallback(async () => {
    const [conns, status, blocked] = await Promise.all([
      fetchConnections({ limit: 40 }),
      fetchBlockingStatus(),
      fetchBlockedDomains(),
    ]);
    setEvents(conns);
    onEventsUpdateRef.current?.(conns);
    setBlockingStatus(status);
    setBlockedSet(new Set(blocked.map((b) => b.domain.toLowerCase())));
  }, []);

  // Single stable effect — WebSocket + intervals created once, never torn down on pause toggle
  useEffect(() => {
    loadInitialData();

    const ws = createLiveWebSocket((newEvent) => {
      if (isPausedRef.current) return;
      setEvents((prev) => {
        // Avoid duplicate events if already present
        if (prev.some((e) => (e.id && e.id === newEvent.id) || (e.timestamp === newEvent.timestamp && e.sni_domain === newEvent.sni_domain))) {
          return prev;
        }
        const updated = [newEvent, ...prev.slice(0, 80)];
        onEventsUpdateRef.current?.(updated);
        return updated;
      });
    });

    // Resilient periodic sync to ensure stream is never interrupted
    const syncInterval = setInterval(async () => {
      if (isPausedRef.current) return;
      try {
        const latestConns = await fetchConnections({ limit: 40 });
        if (Array.isArray(latestConns) && latestConns.length > 0) {
          setEvents((prev) => {
            const combinedMap = new Map<string | number, ConnectionEvent>();
            for (const item of [...latestConns, ...prev]) {
              const key = item.id || `${item.sni_domain}-${item.timestamp}`;
              if (!combinedMap.has(key)) {
                combinedMap.set(key, item);
              }
            }
            const sorted = Array.from(combinedMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ).slice(0, 80);
            onEventsUpdateRef.current?.(sorted);
            return sorted;
          });
        }
      } catch {}
    }, 2500);

    const blocklistInterval = setInterval(() => {
      fetchBlockedDomains().then((blocked) => {
        setBlockedSet(new Set(blocked.map((b) => b.domain.toLowerCase())));
      });
    }, 12000);

    return () => {
      ws.close();
      clearInterval(syncInterval);
      clearInterval(blocklistInterval);
    };
  }, [loadInitialData]);

  const handleDomainBlocked = () => {
    if (blockModalDomain) {
      setBlockedSet((prev) => new Set([...prev, blockModalDomain.domain.toLowerCase()]));
      setNotification(`Domain ${blockModalDomain.domain} successfully blocked!`);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleAllowRule = async (domain: string) => {
    const ok = await addCustomRule(domain, "allow", "first_party");
    if (ok) {
      setNotification(`Allow rule applied for ${domain}`);
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
    <div className="rounded-3xl glass-card p-6 sm:p-7 flex flex-col h-[680px] relative transition-all duration-300 overflow-visible">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-heading">
                Live Outbound Handshakes
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time TLS ClientHello SNI stream from this machine
            </p>
          </div>
        </div>

        {/* Stream Actions */}
        <div className="flex items-center gap-2">
          {isUserScrolled && (
            <button
              onClick={scrollToTop}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-all shadow-sm"
              title="Jump to latest handshake"
            >
              ↑ Newest
            </button>
          )}

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              isPaused
                ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30"
                : "bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.08]"
            }`}
            title={isPaused ? "Resume live stream" : "Pause live stream"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? "Resume Stream" : "Pause"}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between py-3 border-b border-slate-200/60 dark:border-white/[0.04] text-xs overflow-visible gap-3">
        <div className="flex items-center gap-1.5">
          {[
            { id: "all", label: "All Handshakes" },
            { id: "threats", label: "Flagged Threats" },
            { id: "trackers", label: "Trackers & Ads" },
            { id: "first_party", label: "First Party" },
            { id: "unknown", label: "Unclassified" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                filter === tab.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
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
        <div className="my-2 py-2 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs text-center font-medium animate-count">
          {notification}
        </div>
      )}

      {/* Paused Banner */}
      {isPaused && (
        <div className="py-2 px-4 mb-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-2 font-medium">
          <Pause className="w-3.5 h-3.5" />
          <span>Stream paused — captured events queued in memory</span>
        </div>
      )}

      {/* Live Stream List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.03] pr-1 space-y-1 mt-2 text-sm"
      >
        {filteredEvents.length === 0 ? (
          <div className="py-28 text-center text-slate-500 dark:text-slate-400 text-sm space-y-2">
            <Activity className="w-8 h-8 text-slate-400 mx-auto opacity-50 animate-pulse" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Listening for outbound TLS connections...</p>
            <p className="text-xs text-slate-400">Open a website or application to watch handshakes stream live</p>
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
                className="py-3 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Domain & Category */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <span className="text-slate-400 dark:text-slate-500 text-xs font-mono flex-shrink-0 pt-0.5 sm:pt-0">
                    {timeStr}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${cat.bg} ${cat.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                    {cat.label}
                  </span>

                  <button
                    onClick={() => setDetailDomain({ domain: ev.sni_domain, category: ev.classification })}
                    className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate text-left transition-colors cursor-pointer"
                    title="Click for WHOIS, TLS certificate, and threat intelligence details"
                  >
                    {ev.sni_domain}
                  </button>

                  <span className="text-slate-400 dark:text-slate-500 text-xs font-mono hidden md:inline truncate">
                    → {ev.destination_ip || ev.dst_ip || "WAN"}
                  </span>
                </div>

                {/* Right Metadata & Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                  {ev.threat_vendors && ev.threat_vendors > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {ev.threat_vendors} Vendor Flags
                    </span>
                  ) : null}

                  {isBlocked ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-xs font-semibold">
                      Blocked
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleAllowRule(ev.sni_domain)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-white/[0.06] text-xs font-medium transition-all"
                        title="Allow domain override"
                      >
                        Allow
                      </button>
                      <button
                        onClick={() => setBlockModalDomain({ domain: ev.sni_domain, category: ev.classification })}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200/80 dark:border-white/[0.06] text-xs font-medium transition-all"
                        title="Block domain"
                      >
                        Block
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {blockModalDomain && (
        <BlockModal
          domain={blockModalDomain.domain}
          category={blockModalDomain.category}
          status={blockingStatus}
          onClose={() => setBlockModalDomain(null)}
          onBlocked={handleDomainBlocked}
        />
      )}

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
    </div>
  );
};
