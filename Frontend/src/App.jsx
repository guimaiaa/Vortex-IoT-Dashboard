import { useEffect, useState } from "react";
import { fetchDevices, fetchMeasurements, fetchSettings, updateSettings } from "./api";
import { useWebSocket } from "./hooks/useWebSocket";
import MetricCard from "./components/MetricCard";
import StatusBadge from "./components/StatusBadge";
import HistoryChart from "./components/HistoryChart";
import DeviceSelector from "./components/DeviceSelector";
import AlertSettings from "./components/AlertSettings";
import HistorySearch from "./components/HistorySearch";
import { toLuminosityPercent, withLuminosityPercent } from "./luminosity";
import "./App.css";

const HISTORY_LIMIT = 50;
const PUBLISH_INTERVAL_S = Number(import.meta.env.VITE_PUBLISH_INTERVAL_S) || 10;

export default function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [error, setError] = useState(null);
  const [secondsSinceLastMeasurement, setSecondsSinceLastMeasurement] = useState(null);
  const [manualUpdateFlash, setManualUpdateFlash] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchDevices()
      .then((data) => {
        setDevices(data);
        setSelectedDeviceId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((err) => setError(err.message));
    fetchSettings()
      .then(setSettings)
      .catch((err) => setError(err.message));
  }, []);

  async function handleSaveSettings(tempHigh, tempLow) {
    const updated = await updateSettings(tempHigh, tempLow);
    setSettings(updated); // WS broadcast will also confirm this, but apply right away
  }

  useEffect(() => {
    if (!selectedDeviceId) return;
    fetchMeasurements(selectedDeviceId, HISTORY_LIMIT)
      .then(setMeasurements)
      .catch((err) => setError(err.message));
  }, [selectedDeviceId]);

  const latestReceivedAt = devices.find((d) => d.id === selectedDeviceId)?.latest?.received_at;

  // Counts up locally from 0 instead of comparing Date.now() against the server
  // timestamp - that comparison broke the countdown on machines with the wrong
  // system clock/timezone (e.g. opening the dashboard on a different computer).
  // This way the countdown only ever depends on this browser's own timer ticking,
  // never on wall-clock agreement between the viewer and the server.
  useEffect(() => {
    if (latestReceivedAt) setSecondsSinceLastMeasurement(0);
  }, [latestReceivedAt]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsSinceLastMeasurement((s) => (s === null ? null : s + 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const secondsUntilNext =
    secondsSinceLastMeasurement === null
      ? null
      : Math.max(0, PUBLISH_INTERVAL_S - secondsSinceLastMeasurement);

  function handleMessage(message) {
    if (message.type === "status") {
      setDevices(message.devices);
      return;
    }
    if (message.type === "settings") {
      setSettings(message.data);
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
        setSecondsSinceLastMeasurement(0);
        if (message.trigger === "button") {
          setManualUpdateFlash(true);
          setTimeout(() => setManualUpdateFlash(false), 2500);
        }
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
      {manualUpdateFlash && (
        <div className="manual-update-toast">Atualizado manualmente pelo botao do dispositivo</div>
      )}

      {selectedDevice ? (
        <>
          <section className="status-row">
            <span className="device-id">{selectedDevice.id}</span>
            <StatusBadge online={selectedDevice.online} lastSeen={selectedDevice.last_seen} />
            {secondsUntilNext !== null && (
              <span className="next-update">
                {secondsUntilNext > 0 ? `Proxima leitura em ${secondsUntilNext}s` : "Atualizando..."}
              </span>
            )}
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
              value={toLuminosityPercent(selectedDevice.latest?.luminosity)}
              unit="%"
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
              title="Luminosidade (%)"
              data={withLuminosityPercent(measurements)}
              dataKey="luminosity"
              unit="%"
              color="#facc15"
            />
            <AlertSettings
              settings={settings}
              onSave={handleSaveSettings}
              publishIntervalS={PUBLISH_INTERVAL_S}
            />
            <HistorySearch deviceId={selectedDeviceId} publishIntervalS={PUBLISH_INTERVAL_S} />
          </section>
        </>
      ) : (
        <p className="empty-state">Aguardando o primeiro dispositivo enviar dados...</p>
      )}
    </div>
  );
}
