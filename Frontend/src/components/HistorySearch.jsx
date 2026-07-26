import { useState } from "react";
import { searchMeasurements } from "../api";
import HistoryChart from "./HistoryChart";
import { withLuminosityPercent } from "../luminosity";

const WINDOW_OPTIONS = [
  { label: "+/- 30 min", minutes: 30 },
  { label: "+/- 1 hora", minutes: 60 },
  { label: "+/- 3 horas", minutes: 180 },
  { label: "+/- 6 horas", minutes: 360 },
  { label: "+/- 12 horas", minutes: 720 },
  { label: "+/- 24 horas", minutes: 1440 },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function computeStats(values) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { min, max, avg };
}

export default function HistorySearch({ deviceId, publishIntervalS = 10 }) {
  const now = new Date();
  const [date, setDate] = useState(toDateValue(now));
  const [time, setTime] = useState(toTimeValue(now));
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const center = new Date(`${date}T${time}`);
      const since = `${toDateValue(new Date(center.getTime() - windowMinutes * 60000))}T${toTimeValue(new Date(center.getTime() - windowMinutes * 60000))}`;
      const until = `${toDateValue(new Date(center.getTime() + windowMinutes * 60000))}T${toTimeValue(new Date(center.getTime() + windowMinutes * 60000))}`;
      // Window covers windowMinutes on both sides of the chosen instant - size the
      // limit to fit the whole range at the known publish cadence, with some buffer,
      // otherwise a 12h/24h search would silently get truncated to the most recent slice.
      const limit = Math.ceil((windowMinutes * 2 * 60) / publishIntervalS) + 100;
      const data = await searchMeasurements(deviceId, since, until, limit);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const resultsWithLuminosityPercent = results ? withLuminosityPercent(results) : null;

  const tempStats = results ? computeStats(results.map((m) => m.temperature)) : null;
  const humidityStats = results ? computeStats(results.map((m) => m.humidity)) : null;
  const luminosityStats = resultsWithLuminosityPercent
    ? computeStats(resultsWithLuminosityPercent.map((m) => m.luminosity))
    : null;

  return (
    <div className="chart-card search-card">
      <h3>Pesquisar historico</h3>
      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-row">
          <label>
            Data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Hora
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>
          <button type="submit" disabled={loading || !deviceId}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
        <div className="search-row">
          <label>
            Janela
            <select value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))}>
              {WINDOW_OPTIONS.map((opt) => (
                <option key={opt.minutes} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      {error && <p className="settings-error">{error}</p>}

      {results && results.length === 0 && (
        <p className="chart-empty">Nenhuma medicao nesse periodo</p>
      )}

      {results && results.length > 0 && (
        <>
          <div className="search-stats">
            <div className="search-stat">
              <span className="search-stat-label">Temperatura</span>
              <span className="search-stat-value">
                {tempStats.min.toFixed(1)}&ndash;{tempStats.max.toFixed(1)}&deg;C
              </span>
              <span className="search-stat-avg">media {tempStats.avg.toFixed(1)}&deg;C</span>
            </div>
            <div className="search-stat">
              <span className="search-stat-label">Umidade</span>
              <span className="search-stat-value">
                {humidityStats.min.toFixed(1)}&ndash;{humidityStats.max.toFixed(1)}%
              </span>
              <span className="search-stat-avg">media {humidityStats.avg.toFixed(1)}%</span>
            </div>
            <div className="search-stat">
              <span className="search-stat-label">Luminosidade</span>
              <span className="search-stat-value">
                {luminosityStats.min.toFixed(0)}&ndash;{luminosityStats.max.toFixed(0)}%
              </span>
              <span className="search-stat-avg">media {luminosityStats.avg.toFixed(0)}%</span>
            </div>
          </div>
          <div className="search-charts">
            <HistoryChart
              title="Temperatura (°C)"
              data={results}
              dataKey="temperature"
              unit="°C"
              color="#f97316"
            />
            <HistoryChart
              title="Umidade (%)"
              data={results}
              dataKey="humidity"
              unit="%"
              color="#38bdf8"
            />
            <HistoryChart
              title="Luminosidade (%)"
              data={resultsWithLuminosityPercent}
              dataKey="luminosity"
              unit="%"
              color="#facc15"
            />
          </div>
        </>
      )}
    </div>
  );
}
