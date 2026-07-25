const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchDevices() {
  const res = await fetch(`${API_BASE}/devices`);
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

export async function fetchMeasurements(deviceId, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (deviceId) params.set("device_id", deviceId);
  const res = await fetch(`${API_BASE}/measurements?${params}`);
  if (!res.ok) throw new Error("Failed to fetch measurements");
  return res.json();
}

export function wsUrl() {
  const base = new URL(API_BASE);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/ws";
  return base.toString();
}
