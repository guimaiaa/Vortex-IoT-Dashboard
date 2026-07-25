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

export async function searchMeasurements(deviceId, since, until, limit = 3000) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (deviceId) params.set("device_id", deviceId);
  if (since) params.set("since", since);
  if (until) params.set("until", until);
  const res = await fetch(`${API_BASE}/measurements?${params}`);
  if (!res.ok) throw new Error("Failed to search measurements");
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function updateSettings(tempHighThreshold, tempLowThreshold) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      temp_high_threshold: tempHighThreshold,
      temp_low_threshold: tempLowThreshold,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail?.[0]?.msg || "Failed to update settings");
  }
  return res.json();
}

export function wsUrl() {
  const base = new URL(API_BASE);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/ws";
  return base.toString();
}
