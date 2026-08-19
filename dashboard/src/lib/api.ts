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
  is_online?: boolean;
}

export interface DeviceSession {
  id?: number;
  device_mac: string;
  connected_at: string;
  disconnected_at?: string | null;
}

export interface ConnectionEvent {
  id?: number;
  device_mac?: string;
  src_ip?: string;
  dst_ip?: string;
  destination_ip?: string;
  sni_domain: string;
  classification: "tracker" | "ad_network" | "malicious" | "first_party" | "unknown";
  is_blocked?: boolean;
  source?: string;
  timestamp: string;
  device_name?: string;
  vendor?: string;
  threat_vendors?: number;
  threat_details?: string;
}

export interface NetworkStats {
  total_devices: number;
  network_average_score: number;
  total_connections: number;
  tracker_percentage: number;
  classification_breakdown: Record<string, number>;
  top_trackers: Array<{
    sni_domain: string;
    domain?: string;
    classification: string;
    category?: string;
    hits: number;
  }>;
}

export interface CustomRule {
  domain: string;
  action: "allow" | "block";
  category: string;
  created_at: string;
}

export interface BlockedDomain {
  domain: string;
  blocked_at: string;
  category: string;
  reason?: string;
  mode: "test" | "live";
  is_active: number;
}

export interface BlockingStatus {
  test_mode: boolean;
  hosts_path: string;
  can_write_hosts: boolean;
  active_blocks_count: number;
}

export interface DomainEnrichment {
  domain: string;
  ip_address?: string;
  created_year?: number;
  age_days?: number;
  cert_org?: string;
  hosting_provider?: string;
  summary_label: string;
  is_newly_registered?: boolean;
  threat_vendors?: number;
  threat_source?: string;
  threat_details?: string;
}

export async function fetchDevices(): Promise<Device[]> {
  try {
    const res = await fetch(`${API_BASE}/api/devices`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.devices)) return data.devices;
    return [];
  } catch (err) {
    console.error("fetchDevices error:", err);
    return [];
  }
}

export interface DeviceDetailResponse {
  device: Device;
  score_history: Array<{
    computed_at: string;
    score: number;
    tracker_count: number;
    total_count: number;
  }>;
  recent_connections: ConnectionEvent[];
  sessions?: DeviceSession[];
}

export async function fetchDevice(mac: string): Promise<Device | null> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(mac)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.device || data;
  } catch (err) {
    console.error("fetchDevice error:", err);
    return null;
  }
}

export async function fetchDeviceDetails(mac: string): Promise<DeviceDetailResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(mac)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchDeviceDetails error:", err);
    return null;
  }
}

export async function fetchDeviceSessions(mac: string): Promise<DeviceSession[]> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(mac)}/sessions`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  } catch (err) {
    console.error("fetchDeviceSessions error:", err);
    return [];
  }
}

export async function fetchConnections(params?: {
  limit?: number;
  device_mac?: string;
  classification?: string;
}): Promise<ConnectionEvent[]> {
  try {
    const url = new URL(`${API_BASE}/api/connections`);
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());
    if (params?.device_mac) url.searchParams.set("device_mac", params.device_mac);
    if (params?.classification) url.searchParams.set("classification", params.classification);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.connections || [];
  } catch (err) {
    console.error("fetchConnections error:", err);
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

export async function fetchDeviceHistory(mac: string, limit: number = 24): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(mac)}/history?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch (err) {
    console.error("fetchDeviceHistory error:", err);
    return [];
  }
}

export async function fetchCustomRules(): Promise<CustomRule[]> {
  try {
    const res = await fetch(`${API_BASE}/api/custom-rules`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.rules || [];
  } catch (err) {
    console.error("fetchCustomRules error:", err);
    return [];
  }
}

export async function addCustomRule(domain: string, action: "allow" | "block", category: string = "tracker"): Promise<boolean> {
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

export async function deleteDevice(mac: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${encodeURIComponent(mac)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("deleteDevice error:", err);
    return false;
  }
}

export async function scanNetworkDevices(): Promise<{ discovered: any[]; devices: Device[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/scan`, {
      method: "POST",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("scanNetworkDevices error:", err);
    return null;
  }
}

// --- Blocking & Enrichment API Client Methods ---

export async function fetchBlockingStatus(): Promise<BlockingStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/blocking/status`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchBlockingStatus error:", err);
    return null;
  }
}

export async function toggleBlockingMode(test_mode: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/blocking/mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_mode }),
    });
    return res.ok;
  } catch (err) {
    console.error("toggleBlockingMode error:", err);
    return false;
  }
}

export async function fetchBlockedDomains(): Promise<BlockedDomain[]> {
  try {
    const res = await fetch(`${API_BASE}/api/blocking/domains`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.domains || [];
  } catch (err) {
    console.error("fetchBlockedDomains error:", err);
    return [];
  }
}

export async function blockDomain(
  domain: string,
  category: string = "tracker",
  reason: string = ""
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/blocking/block`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, category, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.detail || "Failed to block domain." };
    }
    return { success: true, message: data.message || "Domain blocked successfully." };
  } catch (err: any) {
    return { success: false, message: err.message || "Network error while blocking domain." };
  }
}

export async function unblockDomain(domain: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/blocking/unblock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.detail || "Failed to unblock domain." };
    }
    return { success: true, message: data.message || "Domain unblocked successfully." };
  } catch (err: any) {
    return { success: false, message: err.message || "Network error while unblocking domain." };
  }
}

export async function fetchDomainEnrichment(domain: string): Promise<DomainEnrichment | null> {
  try {
    const res = await fetch(`${API_BASE}/api/blocking/enrichment/${encodeURIComponent(domain)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("fetchDomainEnrichment error:", err);
    return null;
  }
}

export function createLiveWebSocket(
  onMessage: (event: ConnectionEvent) => void,
  onStatusChange?: (connected: boolean) => void
): WebSocket {
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
