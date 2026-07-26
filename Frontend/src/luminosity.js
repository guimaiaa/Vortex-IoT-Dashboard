// The LDR reading is a raw 12-bit ADC value (0-4095), not calibrated lux - see
// docs/wiring.md. Showing it as "lx" implied a precision it doesn't have, so the
// dashboard displays it as a relative percentage of that range instead.
const ADC_MAX = 4095;

export function toLuminosityPercent(raw) {
  if (raw == null) return raw;
  return Math.round((raw / ADC_MAX) * 100);
}

export function withLuminosityPercent(measurements) {
  return measurements.map((m) => ({ ...m, luminosity: toLuminosityPercent(m.luminosity) }));
}
