/**
 * ADC → mA conversion for 4–20 mA sensors on a 100 Ω shunt + OP777 gain stage.
 *
 * Signal path (per channel):
 *   loop current → 100 Ω shunt → non-inverting amp (gain 1.65 = 1 + 130k/200k)
 *   → MCU ADC (3.3 V reference, 12-bit, 0–4095)
 *
 *   0 mA  → 0.00 V shunt → 0.00 V ADC → raw 0
 *   4 mA  → 0.40 V shunt → 0.66 V ADC → raw ~819
 *  20 mA  → 2.00 V shunt → 3.30 V ADC → raw 4095
 */
export const ADC_FULL_SCALE = 4095;
export const ADC_REFERENCE_VOLTS = 3.3;
export const ADC_SHUNT_OHMS = 100;
export const ADC_OP_AMP_GAIN = 1.65;
export const ADC_MA_FULL_SCALE = 20;

/** ~819 counts — where a healthy 4 mA sensor reading lands after conditioning. */
export const ADC_RAW_AT_4MA = Math.round((ADC_FULL_SCALE * 4) / ADC_MA_FULL_SCALE);

/** Convert raw ADC count to measured loop current (0 mA at 0, 20 mA at 4095). */
export function rawAdcToMilliamps(raw: number): number {
  if (!Number.isFinite(raw)) return 0;

  const clamped = Math.min(ADC_FULL_SCALE, Math.max(0, raw));
  return (clamped / ADC_FULL_SCALE) * ADC_MA_FULL_SCALE;
}

/** True when the converted current is within the standard 4–20 mA sensor span. */
export function isAdcInSensorSpan(milliamps: number): boolean {
  return milliamps >= 4 && milliamps <= 20;
}
