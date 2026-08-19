/**
 * Glasshouse API client and WebSocket connection helper.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

export interface Device {
  mac_address: string;
  ip_address?: string;
  device_name?: string;
  vendor?: string;
  first_seen: string;
  last_seen: string;
  current_score?: number;
  current_tracker_count?: number;
  current_total_count?: number;
  score_computed_at?: string;
}

export interface ConnectionEvent {
  id?: number;
  device_mac?: string;
  src_ip?: string;
  dst_ip?: string;
  destination_ip?: string;
  sni_domain: string;
  classification: "tracker" | "ad_network" | "first_party" | "unknown";
  is_blocked?: boolean;
  source?: string;
  timestamp: string;
  device_name?: string;
  vendor?: string;
}

export interface NetworkStats {
  total_devices: number;
  network_average_score: number;
  total_connections: number;
  tracker_percentage: number;
  classification_breakdown: Record<string, number>;
  top_trackers: Array<{
    sni_domain: string;
    classification: string;
    hits: number;
  }>;
}

export interface CustomRule {
  domain: string;
  action: "allow" | "block";
  category: string;
  created_at: string;
}

export async function fetchDevices(): Promise<Device[]> {
  try {
    const res = await fetch(`${API_BASE}/api/devices`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.devices || [];
  } catch (err) {
    console.error("fetchDevices error:", err);
    return [];
  }
}

export async function fetchDeviceDetails(mac: string): Promise<{
  device: Device;
  score_history: Array<{ computed_at: string; score: number; tracker_count: number; total_count: number }>;
  recent_connections: ConnectionEvent[];
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(mac)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchDeviceDetails error:", err);
    return null;
  }
}

export async function fetchRecentConnections(limit = 50, classification?: string): Promise<ConnectionEvent[]> {
  try {
    let url = `${API_BASE}/api/connections?limit=${limit}`;
    if (classification) url += `&classification=${classification}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.connections || [];
  } catch (err) {
    console.error("fetchRecentConnections error:", err);
    return [];
  }
}

export async function fetchStats(): Promise<NetworkStats | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stats`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchStats error:", err);
    return null;
  }
}

export async function fetchCustomRules(): Promise<CustomRule[]> {
  try {
    const res = await fetch(`${API_BASE}/api/custom-rules`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.rules || [];
  } catch (err) {
    console.error("fetchCustomRules error:", err);
    return [];
  }
}

export async function addCustomRule(domain: string, action: "allow" | "block", category = "tracker"): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/custom-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, action, category }),
    });
    return res.ok;
  } catch (err) {
    console.error("addCustomRule error:", err);
    return false;
  }
}

export async function deleteCustomRule(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/custom-rules/${encodeURIComponent(domain)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("deleteCustomRule error:", err);
    return false;
  }
}

export async function renameDevice(mac: string, newName: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(mac)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_name: newName }),
    });
    return res.ok;
  } catch (err) {
    console.error("renameDevice error:", err);
    return false;
  }
}

export function createLiveWebSocket(onMessage: (event: ConnectionEvent) => void, onStatusChange?: (connected: boolean) => void): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/live`);

  ws.onopen = () => {
    onStatusChange?.(true);
  };

  ws.onclose = () => {
    onStatusChange?.(false);
  };

  ws.onerror = () => {
    onStatusChange?.(false);
  };

  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.sni_domain) {
        onMessage(data);
      }
    } catch (err) {
      console.error("Failed to parse WS message:", err);
    }
  };

  return ws;
}
