import type {
  DataTimestamps,
  HistoricalEvent,
  HistoricalMetric,
} from '../types/m3d';
import type { ControllerBlocks } from '../types/devicePacket';
import type { AnalogMapping, BitMapping, EventTimestampMapping, ScalarMetricMapping } from './registerUtils';
import {
  alarmId,
  decodeEventTimestamp,
  scaleAnalog,
  isBitSet,
} from './registerUtils';
import { getMergedRegister, hasMergedRegister } from './normalizePacket';

export function regValue(blocks: ControllerBlocks, reg: string): number {
  return getMergedRegister(blocks, reg) ?? 0;
}

export function getReg(blocks: ControllerBlocks) {
  return (reg: string) => regValue(blocks, reg);
}

export function decodeStatusBits(
  blocks: ControllerBlocks,
  definitions: BitMapping[],
): { id: string; label: string; active: boolean; okWhenActive: boolean }[] {
  const get = getReg(blocks);
  const registerCache = new Map<string, number>();
  return definitions.map(({ label, reg, bit, okWhenActive }) => {
    if (!registerCache.has(reg)) {
      registerCache.set(reg, get(reg));
    }
    return {
      id: alarmId(label),
      label,
      active: isBitSet(registerCache.get(reg) ?? 0, bit),
      okWhenActive: okWhenActive ?? false,
    };
  });
}

export function decodeAnalogs(
  blocks: ControllerBlocks,
  trending: AnalogMapping[],
  historical: AnalogMapping[],
): { id: string; label: string; value: number; unit: string; decimals: number }[] {
  const get = getReg(blocks);
  const all = [...trending, ...historical];
  const seen = new Set<string>();

  return all
    .filter(({ reg }) => {
      if (seen.has(reg)) return false;
      seen.add(reg);
      return hasMergedRegister(blocks, reg);
    })
    .map(({ label, reg, unit, decimals, scale }) => ({
      id: alarmId(label),
      label,
      value: scaleAnalog(get(reg), scale ?? 10),
      unit,
      decimals,
    }));
}

export function decodeScalarMetrics(
  blocks: ControllerBlocks,
  metrics: ScalarMetricMapping[],
): HistoricalMetric[] {
  const get = getReg(blocks);
  return metrics
    .filter(({ reg }) => hasMergedRegister(blocks, reg))
    .map(({ label, reg, unit, decimals, scale }) => ({
      id: alarmId(`${label}-${reg}`),
      label,
      value: scaleAnalog(get(reg), scale ?? 1),
      unit,
      decimals,
    }));
}

export function decodeEvents(
  blocks: ControllerBlocks,
  events: EventTimestampMapping[],
): HistoricalEvent[] {
  const get = (reg: string) => getMergedRegister(blocks, reg);
  return events.map((mapping) => ({
    id: alarmId(mapping.label),
    label: mapping.label,
    at: decodeEventTimestamp(get, mapping),
  }));
}

export function appendPairedDuration(
  metrics: HistoricalMetric[],
  blocks: ControllerBlocks,
  label: string,
  id: string,
  primaryReg: string,
  primaryUnit: string,
  secondaryReg: string,
  secondaryUnit: string,
): void {
  const primary = getMergedRegister(blocks, primaryReg);
  const secondary = getMergedRegister(blocks, secondaryReg);
  if (primary === undefined && secondary === undefined) return;
  metrics.push({
    id,
    label,
    value: primary ?? 0,
    unit: secondary !== undefined ? `${primaryUnit} ${secondary}${secondaryUnit}` : primaryUnit,
    decimals: 0,
  });
}

export function blockTimestamps(blocks: ControllerBlocks): DataTimestamps {
  return {
    trending: blocks.trending.timestamp,
    historical: blocks.historical.timestamp,
  };
}
