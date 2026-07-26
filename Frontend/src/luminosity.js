// The LDR reading is a raw 12-bit ADC value (0-4095), not calibrated lux - see
// docs/wiring.md. Showing it as "lx" implied a precision it doesn't have, so the
// dashboard displays it as a relative percentage of that range instead.
const ADC_MAX = 4095;

// Inverted on purpose: with this LDR's voltage divider wiring, total darkness reads
// close to ADC_MAX and bright light reads close to 0 - the opposite of what "percent
// of brightness" should mean. Flipping it here keeps the raw value stored in the DB
// untouched (still whatever the ADC actually measured) while the dashboard shows the
// intuitive direction (more light = higher %).
export function toLuminosityPercent(raw) {
  if (raw == null) return raw;
  return Math.round(((ADC_MAX - raw) / ADC_MAX) * 100);
}

export function withLuminosityPercent(measurements) {
  return measurements.map((m) => ({ ...m, luminosity: toLuminosityPercent(m.luminosity) }));
}
