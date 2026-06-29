/** Register snapshot from API (trending or historical). */
export interface RegisterSnapshot {
  timestamp: string | null;
  registers: Record<string, number>;
  missingRegisters?: string[];
  rowFound?: boolean;
}

/** Latest ADC snapshot from datastorage.analoginputs (channels 0-7). */
export interface AdcSnapshot {
  timestamp: string | null;
  channels: Record<string, number>;
  rowFound?: boolean;
}

export interface ControllerPacket {
  role: string;
  controllerId: number;
  controllerType: string;
  configured: boolean;
  trending: RegisterSnapshot;
  historical: RegisterSnapshot;
  warnings?: string[];
}

/** Live API envelope (Lambda v2). */
export interface DeviceApiPacket {
  status: string;
  requestId?: string;
  fetchedAt: string;
  deviceId: number;
  configuration?: {
    mainControllerId: number;
    jockeyControllerId: number;
  };
  controllers: {
    main: ControllerPacket;
    jockey: ControllerPacket;
  };
  adc?: AdcSnapshot;
}

/** Normalized internal shape used by the decoder (v2 + legacy). */
export interface ControllerBlocks {
  trending: RegisterSnapshot;
  historical: RegisterSnapshot;
}

export interface NormalizedDeviceData {
  format: 'v2' | 'legacy';
  fetchedAt: string | null;
  deviceId: number | null;
  mainControllerType: string | null;
  jockeyControllerType: string | null;
  main: ControllerBlocks;
  jockey: ControllerBlocks;
  adc?: AdcSnapshot | null;
}
