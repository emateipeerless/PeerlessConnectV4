export interface AdcScaleLimits {
  adcMin: number;
  adcMax: number;
  valueMin: number;
  valueMax: number;
}

/** Linear map: ADC count → engineering value using configured min/max pairs. */
export function scaleAdcToValue(rawAdc: number, limits: AdcScaleLimits): number | null {
  if (!Number.isFinite(rawAdc)) return null;

  const { adcMin, adcMax, valueMin, valueMax } = limits;
  if (![adcMin, adcMax, valueMin, valueMax].every(Number.isFinite)) return null;

  const adcSpan = adcMax - adcMin;
  if (adcSpan === 0) return valueMin;

  const ratio = (rawAdc - adcMin) / adcSpan;
  return valueMin + ratio * (valueMax - valueMin);
}

export function formatScaledValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';

  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function parseScaleField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseScaleLimits(row: {
  adcMin: string;
  adcMax: string;
  valueMin: string;
  valueMax: string;
}): AdcScaleLimits | null {
  const adcMin = parseScaleField(row.adcMin);
  const adcMax = parseScaleField(row.adcMax);
  const valueMin = parseScaleField(row.valueMin);
  const valueMax = parseScaleField(row.valueMax);

  if (adcMin === null || adcMax === null || valueMin === null || valueMax === null) {
    return null;
  }

  return { adcMin, adcMax, valueMin, valueMax };
}

/** Treat readings below the configured ADC minimum as an unconnected sensor. */
export function isAnalogInputConnected(
  rawAdc: number | null,
  limits: AdcScaleLimits | null,
): boolean {
  if (rawAdc === null || limits === null) return false;
  return rawAdc >= limits.adcMin;
}
