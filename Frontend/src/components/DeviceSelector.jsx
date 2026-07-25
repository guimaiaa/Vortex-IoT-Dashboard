export default function DeviceSelector({ devices, selected, onChange }) {
  return (
    <select
      className="device-selector"
      value={selected ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {devices.map((d) => (
        <option key={d.id} value={d.id}>
          {d.id}
        </option>
      ))}
    </select>
  );
}
