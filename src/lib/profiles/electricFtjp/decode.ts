import type { JockeyOperatingMetric, ProfileDecodedSnapshot, SwitchMode } from '../../../types/m3d';
import type { ControllerBlocks, NormalizedDeviceData } from '../../../types/devicePacket';
import { getMergedRegister, hasMergedRegister } from '../../normalizePacket';
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
import {
  decodeRtuStatusBits,
  isBitSet,
  scaleAnalog,
} from '../../registerUtils';
import {
  ELECTRIC_ALARM_BITS,
  ELECTRIC_HISTORICAL_ANALOGS,
  ELECTRIC_HISTORICAL_EVENTS,
  ELECTRIC_HISTORICAL_METRICS,
  ELECTRIC_LOW_PRESSURE_ALARM_ID,
  ELECTRIC_TRENDING_ANALOGS,
  FTJP_DISCHARGE_REG,
  FTJP_RUN_HOURS_REG,
  FTJP_START_PRESSURE_REG,
  FTJP_STARTS_REG,
  FTJP_STOP_PRESSURE_REG,
  FTJP_STATUS_BITS,
  FTJP_STATUS_REG,
  FTJP_SWITCH_REG,
} from './registers';

function decodeFtjpOperatingMetrics(jockey: ControllerBlocks): JockeyOperatingMetric[] {
  const metrics: JockeyOperatingMetric[] = [];

  const startPsi = getMergedRegister(jockey, FTJP_START_PRESSURE_REG);
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

  const stopPsi = getMergedRegister(jockey, FTJP_STOP_PRESSURE_REG);
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

/** FTJP register 25: bit4=AUTO, bit4+bit7=MANUAL, both clear=OFF. */
function decodeFtjpJockeySwitch(value: number): SwitchMode {
  const bit4 = isBitSet(value, 4);
  const bit7 = isBitSet(value, 7);
  if (bit4 && bit7) return 'MANUAL';
  if (bit4) return 'AUTO';
  return 'OFF';
}

export function decodeElectricFtjpPacket(
  data: NormalizedDeviceData,
  receivedAt: Date = new Date(),
): ProfileDecodedSnapshot {
  const { main, jockey } = data;
  const mainGet = getReg(main);
  const analogs = decodeAnalogs(main, ELECTRIC_TRENDING_ANALOGS, ELECTRIC_HISTORICAL_ANALOGS);
  const byId = Object.fromEntries(analogs.map((a) => [a.id, a.value]));

  const hasJockeySwitch = hasMergedRegister(jockey, FTJP_SWITCH_REG);
  const jockeySwitchWord = regValue(jockey, FTJP_SWITCH_REG);
  const hasJockeyStatus = hasMergedRegister(jockey, FTJP_STATUS_REG);
  const jockeyStatusWord = regValue(jockey, FTJP_STATUS_REG);
  const hasJockeyDischarge = hasMergedRegister(jockey, FTJP_DISCHARGE_REG);

  const historicalMetrics = decodeScalarMetrics(main, ELECTRIC_HISTORICAL_METRICS);
  appendPairedDuration(historicalMetrics, main, 'Last Pump Run Time', 'last-pump-run-time', '1814', 'min', '1815', 's');
  appendPairedDuration(historicalMetrics, main, 'Pump Total Run Time', 'pump-total-run-time', '1864', 'h', '1865', 'm');
  appendPairedDuration(historicalMetrics, main, 'Total Controller On Time', 'controller-on-time', '1816', 'h', '1817', 'm');

  const jockeyRunHours = getMergedRegister(jockey, FTJP_RUN_HOURS_REG);
  const jockeyStarts = getMergedRegister(jockey, FTJP_STARTS_REG);

  return {
    controllerBadge: 'MK3E',
    profileId: 'mk3-electric-ftjp',
    configurationLabel: 'MK3 Electric · FTJP',
    mainAnalogSectionTitle: 'Electrical',
    lowPressureAlarmId: ELECTRIC_LOW_PRESSURE_ALARM_ID,
    mainSwitchAvailable: false,
    receivedAt: receivedAt.toISOString(),
    deviceId: data.deviceId,
    mainTimestamps: blockTimestamps(main),
    jockeyTimestamps: blockTimestamps(jockey),
    mainPump: {
      switchMode: 'OFF',
      analog: {
        systemDischargePressure: byId['discharge-pressure'] ?? scaleAnalog(mainGet('2006')),
        battery1Volts: byId['voltage-phase-a'] ?? 0,
        battery2Volts: byId['voltage-phase-b'] ?? 0,
        battery1Amps: byId['current-phase-a'] ?? 0,
        battery2Amps: byId['current-phase-b'] ?? 0,
      },
      analogs,
      alarms: decodeStatusBits(main, ELECTRIC_ALARM_BITS),
      historicalMetrics,
      historicalEvents: decodeEvents(main, ELECTRIC_HISTORICAL_EVENTS),
    },
    jockeyPump: {
      switchMode: hasJockeySwitch ? decodeFtjpJockeySwitch(jockeySwitchWord) : 'OFF',
      runHours: jockeyRunHours ?? 0,
      runHoursDecimals: 0,
      startCount: jockeyStarts ?? 0,
      stopCount: 0,
      operatingMetrics: decodeFtjpOperatingMetrics(jockey),
      discharge: hasJockeyDischarge ? scaleAnalog(regValue(jockey, FTJP_DISCHARGE_REG), 10) : null,
      status: hasJockeyStatus ? decodeRtuStatusBits(jockeyStatusWord, FTJP_STATUS_BITS) : [],
      hasStatusRegister: hasJockeySwitch,
      hasDischargeRegister: hasJockeyDischarge,
    },
  };
}
