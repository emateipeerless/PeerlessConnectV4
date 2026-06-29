export type ScalingRow = {
  adcMin: string;
  adcMax: string;
  valueMin: string;
  valueMax: string;
};

export function emptyScalingRows(): ScalingRow[] {
  return Array.from({ length: 8 }, () => ({
    adcMin: '',
    adcMax: '',
    valueMin: '',
    valueMax: '',
  }));
}

export function parseTemplateId(templateId: string): number | null {
  const trimmed = templateId.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isInteger(value) ? value : null;
}
