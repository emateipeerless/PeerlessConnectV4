/** Standardized analog input labels keyed by template ID, channels 1–8 (index 0–7). */
export const ANALOG_TEMPLATE_LABELS: Record<number, readonly string[]> = {
  1: [
    'Suction Transducer',
    'Flow Meter',
    'Water Tank Transducer',
    'Pump Room Transducer',
    'GVI Flowmeter (Listed)',
    'Diesel Fuel Level Transducer',
    'Closed Cooling Loop Temp',
    'Pump Liquid Temp',
  ],
};

export type AnalogGaugeStyle = 'arc' | 'tank' | 'temperature';

/** Per-channel gauge style for each template (0-indexed channels). */
export const ANALOG_TEMPLATE_GAUGE_STYLES: Record<number, readonly AnalogGaugeStyle[]> = {
  1: ['arc', 'arc', 'tank', 'arc', 'arc', 'tank', 'arc', 'arc'],
};

/** Per-channel engineering units for each template (0-indexed channels). */
export const ANALOG_TEMPLATE_UNITS: Record<number, readonly string[]> = {
  1: ['PSI', 'GPM', 'Gallons', '°F', 'GPM', 'Gallons', '°F', '°F'],
};

export function getAnalogChannelLabel(templateId: number | null, channel: number): string {
  const fallback = `Analog Input ${channel + 1}`;

  if (templateId === null || !Number.isInteger(templateId)) {
    return fallback;
  }

  const labels = ANALOG_TEMPLATE_LABELS[templateId];
  return labels?.[channel] ?? fallback;
}

export function getAnalogGaugeStyle(templateId: number | null, channel: number): AnalogGaugeStyle {
  if (templateId === null || !Number.isInteger(templateId)) {
    return 'arc';
  }

  const styles = ANALOG_TEMPLATE_GAUGE_STYLES[templateId];
  return styles?.[channel] ?? 'arc';
}

export function getAnalogChannelUnit(templateId: number | null, channel: number): string | undefined {
  if (templateId === null || !Number.isInteger(templateId)) {
    return undefined;
  }

  const units = ANALOG_TEMPLATE_UNITS[templateId];
  return units?.[channel];
}

/** Summary tab — compact arc row above pump cards (template 1). */
export const SUMMARY_TOP_ARC_GAUGES: Record<
  number,
  readonly { channel: number; label: string }[]
> = {
  1: [
    { channel: 0, label: 'Suction' },
    { channel: 1, label: 'Flow Meter' },
  ],
};

/** Summary tab — row below pump cards (template 1). */
export const SUMMARY_BOTTOM_GAUGES: Record<
  number,
  readonly { channel: number; label: string; style: 'arc' | 'tank' | 'temperature'; dieselOnly?: boolean }[]
> = {
  1: [
    { channel: 3, label: 'Pump Room Temp', style: 'temperature' },
    { channel: 5, label: 'Diesel Fuel', style: 'tank', dieselOnly: true },
    { channel: 2, label: 'Water Tank', style: 'tank' },
  ],
};

/** Default Modbus discharge gauge range (PSI) on summary when not analog-scaled. */
export const SUMMARY_DISCHARGE_GAUGE_RANGE = { min: 0, max: 300 } as const;
