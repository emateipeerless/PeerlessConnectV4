const HAS_TIMEZONE = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;

/** Server timestamps without an offset are UTC (e.g. FTJP jockey blocks). */
export function parseServerTimestamp(value: string): Date {
  const trimmed = value.trim();
  if (HAS_TIMEZONE.test(trimmed)) {
    return new Date(trimmed);
  }

  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return new Date(`${iso}Z`);
}

export function normalizeServerTimestamp(value: string): string {
  const trimmed = value.trim();
  if (HAS_TIMEZONE.test(trimmed)) {
    return trimmed;
  }

  const iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return `${iso}Z`;
}

export function formatTimestamp(value: string | null): string {
  if (!value) return "—";

  const d = parseServerTimestamp(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString();
}
