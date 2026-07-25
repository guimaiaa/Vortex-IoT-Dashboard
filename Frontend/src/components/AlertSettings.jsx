import { useEffect, useState } from "react";

export default function AlertSettings({ settings, onSave, publishIntervalS }) {
  const [tempHigh, setTempHigh] = useState("");
  const [tempLow, setTempLow] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setTempHigh(String(settings.temp_high_threshold));
    setTempLow(String(settings.temp_low_threshold));
  }, [settings]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await onSave(Number(tempHigh), Number(tempLow));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="chart-card settings-card">
      <h3>Configuracao de alerta</h3>
      <form className="settings-form" onSubmit={handleSubmit}>
        <label>
          Temp. maxima (°C)
          <input
            type="number"
            step="0.1"
            value={tempHigh}
            onChange={(e) => setTempHigh(e.target.value)}
            required
          />
        </label>
        <label>
          Temp. minima (°C)
          <input
            type="number"
            step="0.1"
            value={tempLow}
            onChange={(e) => setTempLow(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
      {error && <p className="settings-error">{error}</p>}
      {saved && (
        <p className="settings-saved">
          Salvo! O ESP32 aplica em ate {publishIntervalS}s (proximo ciclo de leitura).
        </p>
      )}
    </div>
  );
}
