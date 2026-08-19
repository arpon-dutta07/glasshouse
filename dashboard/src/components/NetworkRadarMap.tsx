"use client";

import React, { useEffect, useRef, useState } from "react";
import { ConnectionEvent, Device } from "@/lib/api";
import { playTrackerAlertSound, playMaliciousAlertSound } from "@/lib/sound";
import { Laptop, Smartphone, Router, Globe, ShieldAlert, Wifi, Info, Zap } from "lucide-react";

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
  pulseProgress: number; // 0 to 1 for beam traveling
}

export const NetworkRadarMap: React.FC<NetworkRadarMapProps> = ({
  devices,
  recentEvents,
  onSelectDomain,
  onSelectDevice,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [domainNodes, setDomainNodes] = useState<Map<string, ActiveDomainNode>>(new Map());
  const [hoveredNode, setHoveredNode] = useState<{
    title: string;
    subtitle: string;
    type: string;
    meta: string;
    x: number;
    y: number;
  } | null>(null);

  const [activeBeams, setActiveBeams] = useState<
    Array<{
      id: string;
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
      progress: number;
      color: string;
    }>
  >([]);

  // Dimensions
  const mapWidth = 840;
  const mapHeight = 440;
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;

  // Position devices around the center
  const gatewayDevice = devices.find((d) => d.ip_address?.endsWith(".1")) || {
    mac_address: "gw:00:00:00:00:01",
    ip_address: "192.168.1.1",
    device_name: "Digisol Gateway Router",
    vendor: "Digisol Systems",
  };

  const clientDevices = devices.filter((d) => d.mac_address !== gatewayDevice.mac_address);

  // Position client device nodes in an inner orbit
  const devicePositions = new Map<string, { x: number; y: number; angle: number; device: Device }>();
  const clientRadius = 140;

  clientDevices.forEach((dev, idx) => {
    const total = clientDevices.length || 1;
    // Spread evenly across the inner orbit
    const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * clientRadius;
    const y = centerY + Math.sin(angle) * (clientRadius * 0.85);
    devicePositions.set(dev.mac_address, { x, y, angle, device: dev });
    if (dev.ip_address) {
      devicePositions.set(dev.ip_address, { x, y, angle, device: dev });
    }
  });

  // Color mapping
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "first_party":
        return "#4ade80"; // emerald
      case "tracker":
        return "#f87171"; // red
      case "ad_network":
        return "#fb923c"; // amber
      case "malicious":
        return "#dc2626"; // crimson
      default:
        return "#9ca3af"; // gray
    }
  };

  // Process recent events to populate transient radar domain nodes
  useEffect(() => {
    if (!recentEvents || recentEvents.length === 0) return;
    const latest = recentEvents[0];
    if (!latest || !latest.sni_domain) return;

    // Trigger sound alerts on live Tracker or Malicious hits
    if (latest.classification === "malicious") {
      playMaliciousAlertSound();
    } else if (latest.classification === "tracker" || latest.classification === "ad_network") {
      playTrackerAlertSound();
    }

    const domain = latest.sni_domain.toLowerCase();
    const cat = latest.classification || "unknown";
    const srcMac = latest.device_mac || "";
    const srcIp = latest.src_ip || "";

    // Find source position
    const srcPos = devicePositions.get(srcMac) || devicePositions.get(srcIp) || { x: centerX, y: centerY };

    setDomainNodes((prev) => {
      const next = new Map(prev);
      const now = Date.now();
      const existing = next.get(domain);

      // Compute radar orbit position (outer ring radius ~ 190 to 220px)
      const outerRadius = 210 + (Math.abs(domain.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 35) - 17;
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
          pulseProgress: 0,
        });
      }

      // Keep maximum 24 transient nodes on radar for high performance
      if (next.size > 24) {
        const sorted = Array.from(next.entries()).sort((a, b) => b[1].lastHitTime - a[1].lastHitTime);
        return new Map(sorted.slice(0, 24));
      }
      return next;
    });

    // Spawn animated beam from source device to target domain
    const angle = ((Math.abs(domain.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)) % 360) * Math.PI) / 180;
    const outerRadius = 210;
    const targetX = centerX + Math.cos(angle) * outerRadius;
    const targetY = centerY + Math.sin(angle) * (outerRadius * 0.88);

    const beamId = `${domain}-${Date.now()}`;
    setActiveBeams((prev) => [
      ...prev.slice(-8), // cap concurrent beams
      {
        id: beamId,
        startX: srcPos.x,
        startY: srcPos.y,
        targetX,
        targetY,
        progress: 0,
        color: getCategoryColor(cat),
      },
    ]);
  }, [recentEvents]);

  // Clean up stale domain nodes (> 12s) and animate active beams
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setDomainNodes((prev) => {
        let changed = false;
        const next = new Map();
        prev.forEach((node, key) => {
          if (now - node.lastHitTime < 14000) {
            next.set(key, node);
          } else {
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      // Animate beams
      setActiveBeams((prev) =>
        prev
          .map((b) => ({ ...b, progress: b.progress + 0.15 }))
          .filter((b) => b.progress <= 1)
      );
    }, 60);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl radar-panel p-5 space-y-3 relative overflow-hidden">
      {/* Radar HUD Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-white font-hud">
              LIVE NETWORK SURVEILLANCE RADAR
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              RADIAL SCOPE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px]">First Party</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[11px]">Tracker</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[11px]">Ad Network</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 ring-1 ring-rose-400" />
            <span className="text-[11px]">Threat</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Radar Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[400px] bg-[#070a10]/90 rounded-xl border border-white/[0.04] overflow-hidden flex items-center justify-center select-none"
      >
        <svg
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          className="w-full h-full"
          style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))" }}
        >
          <defs>
            {/* Glow filters */}
            <filter id="radar-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.25)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
            </radialGradient>
          </defs>

          {/* Concentric Radar Range Rings */}
          <circle cx={centerX} cy={centerY} r="60" fill="url(#center-glow)" stroke="rgba(6, 182, 212, 0.12)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={centerX} cy={centerY} r="140" fill="none" stroke="rgba(6, 182, 212, 0.08)" strokeWidth="1" />
          <circle cx={centerX} cy={centerY} r="210" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Range Distance Markers */}
          <text x={centerX + 65} y={centerY - 6} fill="rgba(6, 182, 212, 0.35)" fontSize="9" fontFamily="monospace">GATEWAY</text>
          <text x={centerX + 145} y={centerY - 6} fill="rgba(6, 182, 212, 0.35)" fontSize="9" fontFamily="monospace">LAN DEVICES</text>
          <text x={centerX + 215} y={centerY - 6} fill="rgba(255, 255, 255, 0.25)" fontSize="9" fontFamily="monospace">WAN DOMAINS</text>

          {/* Coordinate Crosshairs */}
          <line x1={centerX - 240} y1={centerY} x2={centerX + 240} y2={centerY} stroke="rgba(6, 182, 212, 0.05)" strokeWidth="1" />
          <line x1={centerX} y1={centerY - 190} x2={centerX} y2={centerY + 190} stroke="rgba(6, 182, 212, 0.05)" strokeWidth="1" />

          {/* Sweeping Radar Cone Animation */}
          <g transform={`rotate(0 ${centerX} ${centerY})`}>
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + 220}
              y2={centerY}
              stroke="rgba(6, 182, 212, 0.4)"
              strokeWidth="1.5"
              className="animate-radar-sweep origin-center"
              style={{ transformOrigin: `${centerX}px ${centerY}px` }}
            />
          </g>

          {/* Connection Lines from Gateway to Connected Client Devices */}
          {Array.from(devicePositions.values()).map(({ x, y, device }, i) => (
            <g key={`link-${device.mac_address}-${i}`}>
              <line
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="rgba(6, 182, 212, 0.25)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            </g>
          ))}

          {/* Active Laser Beams to Outer Domains */}
          {activeBeams.map((beam) => {
            const currentX = beam.startX + (beam.targetX - beam.startX) * beam.progress;
            const currentY = beam.startY + (beam.targetY - beam.startY) * beam.progress;
            return (
              <g key={beam.id}>
                <line
                  x1={beam.startX}
                  y1={beam.startY}
                  x2={currentX}
                  y2={currentY}
                  stroke={beam.color}
                  strokeWidth="2"
                  strokeOpacity={1 - beam.progress * 0.6}
                  style={{ filter: `drop-shadow(0 0 4px ${beam.color})` }}
                />
                <circle cx={currentX} cy={currentY} r="3" fill={beam.color} />
              </g>
            );
          })}

          {/* Center Hub: Gateway Router */}
          <g
            className="cursor-pointer group"
            onClick={() => onSelectDevice?.(gatewayDevice.mac_address)}
            onMouseEnter={(e) =>
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
            <circle cx={centerX} cy={centerY} r="22" fill="#090d16" stroke="#06b6d4" strokeWidth="2" style={{ filter: "drop-shadow(0 0 10px rgba(6,182,212,0.5))" }} />
            <circle cx={centerX} cy={centerY} r="28" fill="none" stroke="rgba(6,182,212,0.3)" strokeWidth="1" className="animate-pulse" />
            <text x={centerX} y={centerY + 4} textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
              GW
            </text>
            <text x={centerX} y={centerY + 38} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
              192.168.1.1
            </text>
          </g>

          {/* Connected LAN Device Nodes */}
          {Array.from(devicePositions.values()).map(({ x, y, device }) => {
            const isHost = device.device_name?.toLowerCase().includes("pc") || device.ip_address === "192.168.1.2";
            const color = isHost ? "#06b6d4" : "#38bdf8";

            return (
              <g
                key={device.mac_address}
                className="cursor-pointer group"
                onClick={() => onSelectDevice?.(device.mac_address)}
                onMouseEnter={() =>
                  setHoveredNode({
                    title: device.device_name || "LAN Device",
                    subtitle: `${device.ip_address || "—"} • ${device.mac_address}`,
                    type: isHost ? "Sniffer Host (Active Sniffing)" : "Wi-Fi Client Device",
                    meta: device.vendor || "Generic Device",
                    x,
                    y: y - 25,
                  })
                }
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Node Ring */}
                <circle cx={x} cy={y} r="14" fill="#0b111c" stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
                {isHost && (
                  <circle cx={x} cy={y} r="18" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 2" className="animate-spin origin-center" style={{ transformOrigin: `${x}px ${y}px` }} />
                )}
                <circle cx={x} cy={y} r="4" fill={color} />

                {/* Device Label */}
                <text x={x} y={y + 24} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600" fontFamily="sans-serif">
                  {device.device_name?.split(" ")[0] || "Device"}
                </text>
                <text x={x} y={y + 35} textAnchor="middle" fill="#64748b" fontSize="8.5" fontFamily="monospace">
                  {device.ip_address || device.mac_address.slice(-5)}
                </text>
              </g>
            );
          })}

          {/* Outer Perimeter: Active Captured Domain Nodes */}
          {Array.from(domainNodes.values()).map((node) => {
            const color = getCategoryColor(node.category);
            const nodeRadius = Math.min(12, 6 + Math.log2(node.hits + 1) * 2);
            const isThreat = node.category === "malicious";

            return (
              <g
                key={node.id}
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
                {/* Ping wave */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.4"
                  className="animate-ping"
                />
                {/* Main Node */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius}
                  fill="#0b111c"
                  stroke={color}
                  strokeWidth={isThreat ? "2.5" : "1.5"}
                  style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                />
                <circle cx={node.x} cy={node.y} r={nodeRadius * 0.4} fill={color} />

                {/* Truncated Domain Label */}
                <text
                  x={node.x}
                  y={node.y + nodeRadius + 11}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8.5"
                  fontFamily="monospace"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
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
            className="absolute pointer-events-none z-30 px-3 py-2 rounded-lg bg-[#0c121e]/95 border border-cyan-500/40 text-xs shadow-2xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full"
            style={{ left: `${(hoveredNode.x / mapWidth) * 100}%`, top: `${(hoveredNode.y / mapHeight) * 100}%` }}
          >
            <div className="font-bold text-white font-mono">{hoveredNode.title}</div>
            <div className="text-[11px] text-cyan-300 font-mono mt-0.5">{hoveredNode.subtitle}</div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between gap-3">
              <span>{hoveredNode.type}</span>
              <span className="text-slate-500 font-mono">{hoveredNode.meta}</span>
            </div>
          </div>
        )}

        {/* Bottom HUD Scan Metrics */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-500 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">SCOPE: 360°</span>
            <span>•</span>
            <span>ACTIVE TARGETS: {domainNodes.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>PROMISCUOUS: PASSIVE SNI</span>
            <span>•</span>
            <span className="text-emerald-400">LATENCY: &lt;1ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
