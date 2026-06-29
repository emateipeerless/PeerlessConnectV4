/** Raw IoT packet from M3D template */
export interface M3dPacket {
  rtu: {
    /** Jockey total run hours */
    rhrs?: number;
    stop?: number;
    /** Jockey start count */
    start?: number;
    /** Jockey status register (RTU reg 12) — switch position + status bits */
    status?: number;
    stcount?: number;
  };
  tcp: Record<string, number>;
}

export type SwitchMode = 'OFF' | 'AUTO' | 'MANUAL';

/** @deprecated Use SwitchMode */
export type MainSwitchMode = SwitchMode;

export interface AnalogValues {
  systemDischargePressure: number;
  battery1Volts: number;
  battery2Volts: number;
  battery1Amps: number;
  battery2Amps: number;
}

export interface AnalogReading {
  id: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
}

/** Hardware ADC channel with raw count and mA conversion. */
export interface AdcInputReading {
  id: string;
  channel: number;
  label: string;
  rawValue: number;
  milliamps: number;
  /** Within standard 4–20 mA sensor operating span */
  inSensorSpan: boolean;
}

export interface StatusItem {
  id: string;
  label: string;
  active: boolean;
  okWhenActive: boolean;
}

/** @deprecated Use StatusItem */
export type AlarmItem = StatusItem;

export interface HistoricalMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
}

export interface HistoricalEvent {
  id: string;
  label: string;
  /** ISO timestamp when all register parts are present */
  at: string | null;
}

export interface DataTimestamps {
  trending: string | null;
  historical: string | null;
}

export interface MainPumpState {
  switchMode: SwitchMode;
  analog: AnalogValues;
  analogs: AnalogReading[];
  alarms: StatusItem[];
  historicalMetrics: HistoricalMetric[];
  historicalEvents: HistoricalEvent[];
}

export interface JockeyOperatingMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  decimals: number;
  /** Wider stacked layout for long labels (e.g. pressure settings) */
  variant?: 'pressure-setting';
}

export interface JockeyPumpState {
  switchMode: SwitchMode;
  runHours: number;
  /** Decimal places for run hours display (FCJC reg 6 uses ÷100 scaling) */
  runHoursDecimals: number;
  startCount: number;
  stopCount: number;
  /** Profile-specific operating stats (e.g. FCJC pressure settings) */
  operatingMetrics: JockeyOperatingMetric[];
  /** null until TCP register 18 is available in the packet */
  discharge: number | null;
  status: StatusItem[];
  /** RTU status word (register 12) present in packet */
  hasStatusRegister: boolean;
  /** TCP register 18 (jockey discharge) not yet pulled on all devices */
  hasDischargeRegister: boolean;
}

import type { DeviceProfileId } from '../config/devices';

export type { DeviceProfileId };

export type MainControllerBadge = 'MK3D' | 'MK3E';

export type ProfileDecodedSnapshot = Omit<
  FirePumpSnapshot,
  'mainControllerOffline' | 'jockeyControllerOffline' | 'adcInputs' | 'adcTimestamp'
>;

export interface FirePumpSnapshot {
  /** Header pill label — MK3D (diesel) or MK3E (electric) */
  controllerBadge: MainControllerBadge;
  profileId: DeviceProfileId;
  configurationLabel: string;
  mainAnalogSectionTitle: string;
  lowPressureAlarmId: string;
  mainSwitchAvailable: boolean;
  receivedAt: string;
  deviceId: number | null;
  mainTimestamps: DataTimestamps;
  jockeyTimestamps: DataTimestamps;
  /** Latest packet has all-zero / missing registers for main controller */
  mainControllerOffline: boolean;
  /** Latest packet has all-zero / missing registers for jockey controller */
  jockeyControllerOffline: boolean;
  mainPump: MainPumpState;
  jockeyPump: JockeyPumpState;
  /** Hardware ADC channels from datastorage.analoginputs (4–20 mA) */
  adcInputs: AdcInputReading[];
  adcTimestamp: string | null;
}
