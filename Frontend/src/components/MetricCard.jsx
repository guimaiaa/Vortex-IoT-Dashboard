export default function MetricCard({ label, value, unit, accent }) {
  return (
    <div className="metric-card" style={{ "--accent": accent }}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {value ?? "--"}
        {value != null && <span className="metric-unit">{unit}</span>}
      </span>
    </div>
  );
}
