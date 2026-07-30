import { useEffect, useState } from "react";

function formatElapsed(seconds) {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function StatusBadge({ online, lastSeen }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Counts up locally instead of comparing Date.now() to the server's `lastSeen`
  // timestamp - the same clock-skew problem the "next reading" countdown had (see
  // App.jsx): a viewer with the wrong system clock/timezone would see a bogus
  // "last seen" value. Resetting to 0 whenever a fresh lastSeen arrives and ticking
  // locally from there makes it immune to that.
  useEffect(() => {
    setElapsedSeconds(0);
  }, [lastSeen]);

  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`status-badge ${online ? "online" : "offline"}`}>
      <span className="status-dot" />
      {online ? "Online" : "Offline"}
      <span className="status-lastseen">
        last seen {lastSeen ? formatElapsed(elapsedSeconds) : "never"}
      </span>
    </div>
  );
}
