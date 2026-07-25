function timeAgo(iso) {
  if (!iso) return "never";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function StatusBadge({ online, lastSeen }) {
  return (
    <div className={`status-badge ${online ? "online" : "offline"}`}>
      <span className="status-dot" />
      {online ? "Online" : "Offline"}
      <span className="status-lastseen">last seen {timeAgo(lastSeen)}</span>
    </div>
  );
}
