import type { JockeyOperatingMetric, ProfileDecodedSnapshot, SwitchMode } from '../../../types/m3d';
import type { ControllerBlocks } from '../../../types/devicePacket';
import type { NormalizedDeviceData } from '../../../types/devicePacket';
import { getJockeyRtuField, getMergedRegister, hasMergedRegister } from '../../normalizePacket';
import {
  blockTimestamps,
  decodeAnalogs,
  decodeEvents,
  decodeScalarMetrics,
  decodeStatusBits,
  appendPairedDuration,
  getReg,
  regValue,
} from '../../decodeShared';
import { decodeRtuStatusBits, isBitSet, scaleAnalog } from '../../registerUtils';
import {
  DIESEL_ALARM_BITS,
  DIESEL_HISTORICAL_ANALOGS,
  DIESEL_HISTORICAL_EVENTS,
  DIESEL_HISTORICAL_METRICS,
  DIESEL_LOW_PRESSURE_ALARM_ID,
  DIESEL_TRENDING_ANALOGS,
  FCJC_DISCHARGE_REG,
  FCJC_RUN_HOURS_REG,
  FCJC_RUN_HOURS_SCALE,
  FCJC_START_PRESSURE_REG,
  FCJC_STARTS_HIGH_REG,
  FCJC_STARTS_REG,
  FCJC_STOP_PRESSURE_REG,
  FCJC_MAIN_SWITCH_BITS,
  FCJC_STATUS_BITS,
  FCJC_STATUS_REG,
  FCJC_SWITCH_BITS,
} from './registers';

function decodeDieselMainSwitch(getReg: (reg: string) => number): SwitchMode {
  const modeReg = getReg(FCJC_MAIN_SWITCH_BITS.auto.reg);
  const offReg = getReg(FCJC_MAIN_SWITCH_BITS.off.reg);
  if (isBitSet(modeReg, FCJC_MAIN_SWITCH_BITS.manual.bit)) return 'MANUAL';
  if (isBitSet(modeReg, FCJC_MAIN_SWITCH_BITS.auto.bit)) return 'AUTO';
  if (isBitSet(offReg, FCJC_MAIN_SWITCH_BITS.off.bit)) return 'OFF';
  return 'OFF';
}

function decodeFcjcJockeySwitch(value: number): SwitchMode {
  if (isBitSet(value, FCJC_SWITCH_BITS.manual)) return 'MANUAL';
  if (isBitSet(value, FCJC_SWITCH_BITS.auto)) return 'AUTO';
  return 'OFF';
}

/** Combine low/high Modbus words into a 32-bit value when high register is present. */
function decodeModbusLong(blocks: ControllerBlocks, lowReg: string, highReg: string): number | undefined {
  const low = getMergedRegister(blocks, lowReg);
  if (low === undefined) return undefined;
  const high = getMergedRegister(blocks, highReg);
  if (high !== undefined) return (high << 16) | (low & 0xffff);
  return low;
}

function decodeFcjcRunHours(jockey: ControllerBlocks): number {
  const raw = decodeModbusLong(jockey, FCJC_RUN_HOURS_REG, '7');
  if (raw !== undefined) return scaleAnalog(raw, FCJC_RUN_HOURS_SCALE);
  return getJockeyRtuField(jockey, 'rhrs') ?? 0;
}

function decodeFcjcStarts(jockey: ControllerBlocks): number {
  const raw = decodeModbusLong(jockey, FCJC_STARTS_REG, FCJC_STARTS_HIGH_REG);
  if (raw !== undefined) return raw;
  return getJockeyRtuField(jockey, 'start') ?? 0;
}

function decodeFcjcOperatingMetrics(jockey: ControllerBlocks): JockeyOperatingMetric[] {
  const metrics: JockeyOperatingMetric[] = [];

  const startPsi = getMergedRegister(jockey, FCJC_START_PRESSURE_REG);
  if (startPsi !== undefined) {
    metrics.push({
      id: 'jockey-start-pressure',
      label: 'Start Pressure Setting',
      value: startPsi,
      unit: 'PSI',
      decimals: 0,
      variant: 'pressure-setting',
    });
  }

  const stopPsi = getMergedRegister(jockey, FCJC_STOP_PRESSURE_REG);
  if (stopPsi !== undefined) {
    metrics.push({
      id: 'jockey-stop-pressure',
      label: 'Stop Pressure Setting',
      value: stopPsi,
      unit: 'PSI',
      decimals: 0,
      variant: 'pressure-setting',
    });
  }

  return metrics;
}

export function decodeDieselFcjcPacket(
  data: NormalizedDeviceData,
  receivedAt: Date = new Date(),
): ProfileDecodedSnapshot {
  const { main, jockey } = data;
  const mainGet = getReg(main);
  const analogs = decodeAnalogs(main, DIESEL_TRENDING_ANALOGS, DIESEL_HISTORICAL_ANALOGS);
  const byId = Object.fromEntries(analogs.map((a) => [a.id, a.value]));

  const hasJockeyStatusReg = hasMergedRegister(jockey, FCJC_STATUS_REG);
  const jockeyStatusWord = regValue(jockey, FCJC_STATUS_REG);
  const hasJockeyDischarge = hasMergedRegister(jockey, FCJC_DISCHARGE_REG);

  const historicalMetrics = decodeScalarMetrics(main, DIESEL_HISTORICAL_METRICS);
  appendPairedDuration(historicalMetrics, main, 'Last Engine Run Duration', 'last-engine-run-duration', '1804', 'h', '1805', 's');
  appendPairedDuration(historicalMetrics, main, 'Engine Total Run Time', 'engine-total-run-time', '1806', 'h', '1807', 'm');

  return {
    controllerBadge: 'MK3D',
    profileId: 'mk3-diesel-fcjc',
    configurationLabel: 'MK3 Diesel · FCJC',
    mainAnalogSectionTitle: 'Batteries',
    lowPressureAlarmId: DIESEL_LOW_PRESSURE_ALARM_ID,
    mainSwitchAvailable: true,
    receivedAt: receivedAt.toISOString(),
    deviceId: data.deviceId,
    mainTimestamps: blockTimestamps(main),
    jockeyTimestamps: blockTimestamps(jockey),
    mainPump: {
      switchMode: decodeDieselMainSwitch(mainGet),
      analog: {
        systemDischargePressure: byId['system-discharge-pressure'] ?? scaleAnalog(mainGet('2006')),
        battery1Volts: byId['battery-1-volts'] ?? 0,
        battery2Volts: byId['battery-2-volts'] ?? 0,
        battery1Amps: byId['battery-1-amps'] ?? 0,
        battery2Amps: byId['battery-2-amps'] ?? 0,
      },
      analogs,
      alarms: decodeStatusBits(main, DIESEL_ALARM_BITS),
      historicalMetrics,
      historicalEvents: decodeEvents(main, DIESEL_HISTORICAL_EVENTS),
    },
    jockeyPump: {
      switchMode: hasJockeyStatusReg ? decodeFcjcJockeySwitch(jockeyStatusWord) : 'OFF',
      runHours: decodeFcjcRunHours(jockey),
      runHoursDecimals: hasMergedRegister(jockey, FCJC_RUN_HOURS_REG) ? 2 : 0,
      startCount: decodeFcjcStarts(jockey),
      stopCount: getJockeyRtuField(jockey, 'stop') ?? 0,
      operatingMetrics: decodeFcjcOperatingMetrics(jockey),
      discharge: hasJockeyDischarge ? regValue(jockey, FCJC_DISCHARGE_REG) : null,
      status: hasJockeyStatusReg ? decodeRtuStatusBits(jockeyStatusWord, FCJC_STATUS_BITS) : [],
      hasStatusRegister: hasJockeyStatusReg,
      hasDischargeRegister: hasJockeyDischarge,
    },
  };
}
