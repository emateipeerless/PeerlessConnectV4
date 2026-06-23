export type BitMapping = {
  label: string;
  reg: string;
  bit: number;
  okWhenActive?: boolean;
};

export type RtuBitMapping = {
  label: string;
  bit: number;
  okWhenActive?: boolean;
};

export type AnalogMapping = {
  label: string;
  reg: string;
  unit: string;
  decimals: number;
  /** Divide raw by this (default 10). Use 1 for unscaled values. */
  scale?: number;
};

export type ScalarMetricMapping = {
  label: string;
  reg: string;
  unit: string;
  decimals: number;
  scale?: number;
};

export type EventTimestampMapping = {
  label: string;
  hour: string;
  minute: string;
  second: string;
  month: string;
  day: string;
  year: string;
};

export const ANALOG_SCALE = 10;

export function alarmId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function scaleAnalog(raw: number, scale: number = ANALOG_SCALE): number {
  return raw / scale;
}

export function isBitSet(value: number, bit: number): boolean {
  return ((value >> bit) & 1) === 1;
}

export function decodeEventTimestamp(
  getReg: (reg: string) => number | undefined,
  mapping: EventTimestampMapping,
): string | null {
  const hour = getReg(mapping.hour);
  const minute = getReg(mapping.minute);
  const second = getReg(mapping.second);
  const month = getReg(mapping.month);
  const day = getReg(mapping.day);
  const year = getReg(mapping.year);

  if (
    hour === undefined ||
    minute === undefined ||
    second === undefined ||
    month === undefined ||
    day === undefined ||
    year === undefined
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function decodeRtuStatusBits(
  statusWord: number,
  definitions: RtuBitMapping[],
): { id: string; label: string; active: boolean; okWhenActive: boolean }[] {
  return definitions.map(({ label, bit, okWhenActive }) => ({
    id: alarmId(label),
    label,
    active: isBitSet(statusWord, bit),
    okWhenActive: okWhenActive ?? false,
  }));
}
