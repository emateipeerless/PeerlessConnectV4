export interface AnalogScaleChannel {
  adcMin: number | null;
  adcMax: number | null;
  valueMin: number | null;
  valueMax: number | null;
}

export interface AnalogScalesResponse {
  success: boolean;
  deviceId: number;
  found: boolean;
  template: number | null;
  channels: AnalogScaleChannel[];
  message?: string;
  error?: string;
}

export interface SaveAnalogScalesPayload {
  deviceId: number;
  template: number;
  channels: Array<{
    adcMin: number;
    adcMax: number;
    valueMin: number;
    valueMax: number;
  }>;
}
