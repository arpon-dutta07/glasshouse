"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { ConnectionEvent, Device } from "@/lib/api";
import { playTrackerAlertSound, playMaliciousAlertSound } from "@/lib/sound";
import { Globe, ShieldAlert, Wifi } from "lucide-react";

interface NetworkRadarMapProps {
  devices: Device[];
  recentEvents: ConnectionEvent[];
  onSelectDomain?: (domain: string, category: string) => void;
  onSelectDevice?: (mac: string) => void;
}

interface ActiveDomainNode {
  id: string;
  domain: string;
  category: "tracker" | "ad_network" | "malicious" | "first_party" | "unknown";
  sourceDeviceMac?: string;
  sourceDeviceIp?: string;
  hits: number;
  lastHitTime: number;
  x: number;
  y: number;
  angle: number;
  radius: number;
}

interface PlacedDevice {
  device: Device;
  x: number;
  y: number;
  angle: number;
}

export const NetworkRadarMap: React.FC<NetworkRadarMapProps> = ({
  devices,
  recentEvents,
  onSelectDomain,
  onSelectDevice,
}) => {
  const [domainNodes, setDomainNodes] = useState<Map<string, ActiveDomainNode>>(new Map());
  const [hoveredNode, setHoveredNode] = useState<{
    title: string;
    subtitle: string;
    type: string;
    meta: string;
    x: number;
    y: number;
  } | null>(null);

  // Fixed dimensions for SVG coordinate system
  const mapWidth = 840;
  const mapHeight = 440;
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;

  // Deduplicate and filter ONLY online devices for the live radar scope
  const { onlineDevices, gatewayDevice, placedClientDevices, devicePositionLookup } = useMemo(() => {
    const uniqueOnlineMap = new Map<string, Device>();
    devices
      .filter((d) => d.is_online !== false)
      .forEach((d) => {
        if (d.mac_address) {
          uniqueOnlineMap.set(d.mac_address.toLowerCase().trim(), d);
        }
      });
    const online = Array.from(uniqueOnlineMap.values());

    const gw = online.find((d) => d.ip_address?.endsWith(".1")) || {
      mac_address: "gw:00:00:00:00:01",
      ip_address: "192.168.1.1",
      device_name: "Digisol Gateway Router",
      vendor: "Digisol Systems",
      is_online: true,
    };

    const clients = online.filter(
      (d) => d.mac_address.toLowerCase() !== gw.mac_address.toLowerCase()
    );

    const placed: PlacedDevice[] = [];
    const lookup = new Map<string, { x: number; y: number }>();
    const clientRadius = 140;

    clients.forEach((dev, idx) => {
      const total = clients.length || 1;
      const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * clientRadius;
      const y = centerY + Math.sin(angle) * (clientRadius * 0.85);

      placed.push({ device: dev, x, y, angle });
      lookup.set(dev.mac_address.toLowerCase(), { x, y });
      if (dev.ip_address) {
        lookup.set(dev.ip_address, { x, y });
      }
    });

    return {
      onlineDevices: online,
      gatewayDevice: gw,
      placedClientDevices: placed,
      devicePositionLookup: lookup,
    };
  }, [devices]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "first_party":
        return "#16a34a";
      case "tracker":
        return "#ef4444";
      case "ad_network":
        return "#f97316";
      case "malicious":
        return "#dc2626";
      default:
        return "#94a3b8";
    }
  };

  // Process latest connection events (Efficient, no animation spam)
  useEffect(() => {
    if (!recentEvents || recentEvents.length === 0) return;
    const latest = recentEvents[0];
    if (!latest || !latest.sni_domain) return;

    if (latest.classification === "malicious") {
      playMaliciousAlertSound();
    } else if (latest.classification === "tracker" || latest.classification === "ad_network") {
      playTrackerAlertSound();
    }

    const domain = latest.sni_domain.toLowerCase();
    const cat = latest.classification || "unknown";
    const srcMac = (latest.device_mac || "").toLowerCase();
    const srcIp = latest.src_ip || "";

    setDomainNodes((prev) => {
      const next = new Map(prev);
      const now = Date.now();
      const existing = next.get(domain);

      const outerRadius = 205 + (Math.abs(domain.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 30) - 15;
      const angle = ((Math.abs(domain.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)) % 360) * Math.PI) / 180;
      const targetX = centerX + Math.cos(angle) * outerRadius;
      const targetY = centerY + Math.sin(angle) * (outerRadius * 0.88);

      if (existing) {
        existing.hits += 1;
        existing.lastHitTime = now;
        existing.x = targetX;
        existing.y = targetY;
        next.set(domain, existing);
      } else {
        next.set(domain, {
          id: domain,
          domain,
          category: cat as any,
          sourceDeviceMac: srcMac,
          sourceDeviceIp: srcIp,
          hits: 1,
          lastHitTime: now,
          x: targetX,
          y: targetY,
          angle,
          radius: outerRadius,
        });
      }

      if (next.size > 20) {
        const sorted = Array.from(next.entries()).sort((a, b) => b[1].lastHitTime - a[1].lastHitTime);
        return new Map(sorted.slice(0, 20));
      }
      return next;
    });
  }, [recentEvents]);

  // Prune stale domain nodes at low frequency (every 2.5 seconds, NOT 60ms!)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setDomainNodes((prev) => {
        let changed = false;
        const next = new Map();
        prev.forEach((node, key) => {
          if (now - node.lastHitTime < 16000) {
            next.set(key, node);
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl radar-panel p-5 space-y-3 relative overflow-hidden">
      {/* Radar HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse" />
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-hud">
              LIVE NETWORK SURVEILLANCE RADAR
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
              RADIAL SCOPE • {onlineDevices.length} ONLINE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 text-xs font-mono text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            <span className="text-[11px] font-semibold">First Party</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-400" />
            <span className="text-[11px] font-semibold">Tracker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 dark:bg-orange-400" />
            <span className="text-[11px] font-semibold">Ad Network</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-700 dark:bg-rose-500" />
            <span className="text-[11px] font-semibold">Threat</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Radar Canvas (Optimized, No lag filters) */}
      <div
        className="relative w-full h-[400px] bg-[#070b14] rounded-xl border border-slate-700/50 dark:border-white/[0.06] overflow-hidden flex items-center justify-center select-none"
      >
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-full"
        >
          <defs>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.2)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
            </radialGradient>
          </defs>

          {/* Concentric Radar Range Rings */}
          <circle cx={centerX} cy={centerY} r="60" fill="url(#center-glow)" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={centerX} cy={centerY} r="140" fill="none" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
          <circle cx={centerX} cy={centerY} r="210" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Range Distance Markers */}
          <text x={centerX + 65} y={centerY - 6} fill="rgba(6, 182, 212, 0.6)" fontSize="9" fontFamily="monospace">GATEWAY</text>
          <text x={centerX + 145} y={centerY - 6} fill="rgba(6, 182, 212, 0.6)" fontSize="9" fontFamily="monospace">LAN DEVICES</text>
          <text x={centerX + 215} y={centerY - 6} fill="rgba(255, 255, 255, 0.4)" fontSize="9" fontFamily="monospace">WAN DOMAINS</text>

          {/* Coordinate Crosshairs */}
          <line x1={centerX - 240} y1={centerY} x2={centerX + 240} y2={centerY} stroke="rgba(6, 182, 212, 0.1)" strokeWidth="1" />
          <line x1={centerX} y1={centerY - 190} x2={centerX + 190} y2={centerY} stroke="rgba(6, 182, 212, 0.1)" strokeWidth="1" />

          {/* Sweeping Radar Cone Animation (Hardware Accelerated) */}
          <g style={{ transformOrigin: `${centerX}px ${centerY}px` }} className="animate-radar-sweep">
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + 220}
              y2={centerY}
              stroke="rgba(6, 182, 212, 0.6)"
              strokeWidth="1.5"
            />
          </g>

          {/* Connection Lines from Gateway to Online Client Devices */}
          {placedClientDevices.map(({ x, y, device }) => (
            <line
              key={`link-${device.mac_address}`}
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="rgba(6, 182, 212, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          ))}

          {/* Center Hub: Gateway Router */}
          <g
            className="cursor-pointer group"
            onClick={() => onSelectDevice?.(gatewayDevice.mac_address)}
            onMouseEnter={() =>
              setHoveredNode({
                title: gatewayDevice.device_name || "Wi-Fi Router Gateway",
                subtitle: gatewayDevice.ip_address || "192.168.1.1",
                type: "Gateway Access Point",
                meta: gatewayDevice.vendor || "Digisol Systems",
                x: centerX,
                y: centerY - 30,
              })
            }
            onMouseLeave={() => setHoveredNode(null)}
          >
            <circle cx={centerX} cy={centerY} r="22" fill="#090d16" stroke="#06b6d4" strokeWidth="2" />
            <circle cx={centerX} cy={centerY} r="27" fill="none" stroke="rgba(6,182,212,0.4)" strokeWidth="1" />
            <text x={centerX} y={centerY + 4} textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
              GW
            </text>
            <text x={centerX} y={centerY + 38} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
              192.168.1.1
            </text>
          </g>

          {/* Connected LAN Online Device Nodes */}
          {placedClientDevices.map(({ x, y, device }) => {
            const isHost = device.device_name?.toLowerCase().includes("pc") || device.ip_address === "192.168.1.2";
            const color = isHost ? "#06b6d4" : "#38bdf8";

            return (
              <g
                key={`node-${device.mac_address}`}
                className="cursor-pointer group"
                onClick={() => onSelectDevice?.(device.mac_address)}
                onMouseEnter={() =>
                  setHoveredNode({
                    title: device.device_name || "LAN Device",
                    subtitle: `${device.ip_address || "—"} • ${device.mac_address}`,
                    type: isHost ? "Sniffer Host (Active Sniffing)" : "Wi-Fi Client Device (Online)",
                    meta: device.vendor || "Generic Device",
                    x,
                    y: y - 25,
                  })
                }
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle cx={x} cy={y} r="14" fill="#0b111c" stroke={color} strokeWidth="1.5" />
                <circle cx={x} cy={y} r="4" fill={color} />

                {/* Device Label */}
                <text x={x} y={y + 24} textAnchor="middle" fill="#f1f5f9" fontSize="10" fontWeight="600" fontFamily="sans-serif">
                  {device.device_name?.split(" ")[0] || "Device"}
                </text>
                <text x={x} y={y + 35} textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                  {device.ip_address || device.mac_address.slice(-5)}
                </text>
              </g>
            );
          })}

          {/* Outer Perimeter: Active Captured Domain Nodes */}
          {Array.from(domainNodes.values()).map((node) => {
            const color = getCategoryColor(node.category);
            const nodeRadius = Math.min(11, 6 + Math.log2(node.hits + 1) * 2);
            const isThreat = node.category === "malicious";

            return (
              <g
                key={`domain-${node.id}`}
                className="cursor-pointer group"
                onClick={() => onSelectDomain?.(node.domain, node.category)}
                onMouseEnter={() =>
                  setHoveredNode({
                    title: node.domain,
                    subtitle: `Category: ${node.category.toUpperCase().replace("_", " ")}`,
                    type: `Captured Hits: ${node.hits}`,
                    meta: `Source: ${node.sourceDeviceIp || node.sourceDeviceMac || "LAN"}`,
                    x: node.x,
                    y: node.y - 20,
                  })
                }
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius}
                  fill="#0b111c"
                  stroke={color}
                  strokeWidth={isThreat ? "2.5" : "1.5"}
                />
                <circle cx={node.x} cy={node.y} r={nodeRadius * 0.45} fill={color} />

                <text
                  x={node.x}
                  y={node.y + nodeRadius + 11}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  {node.domain.length > 16 ? node.domain.slice(0, 14) + "…" : node.domain}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && (
          <div
            className="absolute pointer-events-none z-30 px-3 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-xs shadow-2xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full"
            style={{ left: `${(hoveredNode.x / mapWidth) * 100}%`, top: `${(hoveredNode.y / mapHeight) * 100}%` }}
          >
            <div className="font-bold text-white font-mono">{hoveredNode.title}</div>
            <div className="text-[11px] text-cyan-300 font-mono mt-0.5">{hoveredNode.subtitle}</div>
            <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between gap-3 font-sans">
              <span>{hoveredNode.type}</span>
              <span className="text-slate-400 font-mono">{hoveredNode.meta}</span>
            </div>
          </div>
        )}

        {/* Bottom HUD Metrics */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-400 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">SCOPE: 360°</span>
            <span>•</span>
            <span>ACTIVE DOMAINS: {domainNodes.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>PROMISCUOUS: PASSIVE SNI</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">LATENCY: &lt;1ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
