import { useEffect, useState } from "react";
import { fetchDevices, fetchMeasurements } from "./api";
import { useWebSocket } from "./hooks/useWebSocket";
import MetricCard from "./components/MetricCard";
import StatusBadge from "./components/StatusBadge";
import HistoryChart from "./components/HistoryChart";
import DeviceSelector from "./components/DeviceSelector";
import "./App.css";

const HISTORY_LIMIT = 50;

export default function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDevices()
      .then((data) => {
        setDevices(data);
        setSelectedDeviceId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    fetchMeasurements(selectedDeviceId, HISTORY_LIMIT)
      .then(setMeasurements)
      .catch((err) => setError(err.message));
  }, [selectedDeviceId]);

  function handleMessage(message) {
    if (message.type === "status") {
      setDevices(message.devices);
      return;
    }
    if (message.type === "measurement") {
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === message.device.id);
        return exists
          ? prev.map((d) => (d.id === message.device.id ? message.device : d))
          : [...prev, message.device];
      });
      setSelectedDeviceId((current) => current ?? message.device.id);
      if (message.data.device_id === selectedDeviceId) {
        setMeasurements((prev) => [message.data, ...prev].slice(0, HISTORY_LIMIT));
      }
    }
  }

  useWebSocket(handleMessage);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Vortex IoT Dashboard</h1>
          <p className="subtitle">Monitoramento inteligente de ambientes</p>
        </div>
        {devices.length > 1 && (
          <DeviceSelector
            devices={devices}
            selected={selectedDeviceId}
            onChange={setSelectedDeviceId}
          />
        )}
      </header>

      {error && <div className="error-banner">{error}</div>}

      {selectedDevice ? (
        <>
          <section className="status-row">
            <span className="device-id">{selectedDevice.id}</span>
            <StatusBadge online={selectedDevice.online} lastSeen={selectedDevice.last_seen} />
          </section>

          <section className="metrics-grid">
            <MetricCard
              label="Temperatura"
              value={selectedDevice.latest?.temperature}
              unit="°C"
              accent="#f97316"
            />
            <MetricCard
              label="Umidade"
              value={selectedDevice.latest?.humidity}
              unit="%"
              accent="#38bdf8"
            />
            <MetricCard
              label="Luminosidade"
              value={selectedDevice.latest?.luminosity}
              unit=" lx"
              accent="#facc15"
            />
          </section>

          <section className="charts-grid">
            <HistoryChart
              title="Temperatura (°C)"
              data={measurements}
              dataKey="temperature"
              unit="°C"
              color="#f97316"
            />
            <HistoryChart
              title="Umidade (%)"
              data={measurements}
              dataKey="humidity"
              unit="%"
              color="#38bdf8"
            />
            <HistoryChart
              title="Luminosidade (lx)"
              data={measurements}
              dataKey="luminosity"
              unit="lx"
              color="#facc15"
            />
          </section>
        </>
      ) : (
        <p className="empty-state">Aguardando o primeiro dispositivo enviar dados...</p>
      )}
    </div>
  );
}
