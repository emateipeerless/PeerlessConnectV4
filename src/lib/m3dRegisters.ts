/**
 * @deprecated Import from `lib/profiles/dieselFcjc/registers` or `lib/registerUtils`.
 */
import type { SwitchMode } from '../types/m3d';
import {
  DIESEL_TRENDING_ANALOGS,
  DIESEL_HISTORICAL_ANALOGS,
  FCJC_MAIN_SWITCH_BITS,
  FCJC_SWITCH_BITS,
} from './profiles/dieselFcjc/registers';
import { isBitSet } from './registerUtils';

export {
  DIESEL_ALARM_BITS as ALARM_BITS,
  DIESEL_TRENDING_ANALOGS as TRENDING_ANALOGS,
  DIESEL_HISTORICAL_ANALOGS as HISTORICAL_ANALOGS,
  DIESEL_HISTORICAL_METRICS as HISTORICAL_METRICS,
  DIESEL_HISTORICAL_EVENTS as HISTORICAL_EVENTS,
  FCJC_DISCHARGE_REG as JOCKEY_DISCHARGE_REG,
  FCJC_STATUS_REG as JOCKEY_RTU_STATUS_REG,
  FCJC_MAIN_SWITCH_BITS as MAIN_SWITCH_BITS,
  FCJC_SWITCH_BITS as JOCKEY_SWITCH_BITS,
  FCJC_STATUS_BITS as JOCKEY_STATUS_BITS,
} from './profiles/dieselFcjc/registers';

export {
  ANALOG_SCALE,
  alarmId,
  scaleAnalog,
  isBitSet,
  decodeEventTimestamp,
  decodeRtuStatusBits,
} from './registerUtils';

export const JOCKEY_RTU_STATUS_FIELD = 'status' as const;
export const ANALOGS = [...DIESEL_TRENDING_ANALOGS, ...DIESEL_HISTORICAL_ANALOGS];

export function decodeMainSwitch(getReg: (reg: string) => number): SwitchMode {
  const modeReg = getReg(FCJC_MAIN_SWITCH_BITS.auto.reg);
  const offReg = getReg(FCJC_MAIN_SWITCH_BITS.off.reg);
  if (isBitSet(modeReg, FCJC_MAIN_SWITCH_BITS.manual.bit)) return 'MANUAL';
  if (isBitSet(modeReg, FCJC_MAIN_SWITCH_BITS.auto.bit)) return 'AUTO';
  if (isBitSet(offReg, FCJC_MAIN_SWITCH_BITS.off.bit)) return 'OFF';
  return 'OFF';
}

export function decodeJockeySwitch(value: number): SwitchMode {
  if (isBitSet(value, FCJC_SWITCH_BITS.manual)) return 'MANUAL';
  if (isBitSet(value, FCJC_SWITCH_BITS.auto)) return 'AUTO';
  return 'OFF';
}
