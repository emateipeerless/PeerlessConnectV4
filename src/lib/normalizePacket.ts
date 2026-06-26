import type { ControllerBlocks, NormalizedDeviceData, RegisterSnapshot } from '../types/devicePacket';
import { normalizeServerTimestamp } from './formatTimestamp';
import { JOCKEY_RTU_STATUS_REG } from './m3dRegisters';

const RTU_COUNTER_KEYS = ['rhrs', 'stop', 'start', 'status', 'stcount'] as const;

const emptyBlock = (): RegisterSnapshot => ({
  timestamp: null,
  registers: {},
});

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function pickRegisters(src: Record<string, unknown> | undefined): Record<string, number> {
  if (!src) return {};
  const registers: Record<string, number> = {};
  for (const [key, value] of Object.entries(src)) {
    if (!/^\d+$/.test(key)) continue;
    const n = Number(value);
    if (Number.isFinite(n)) registers[key] = n;
  }
  return registers;
}

function pickTimestamp(src: Record<string, unknown> | undefined): string | null {
  const raw = src?.timestamp;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return normalizeServerTimestamp(raw);
}

function parseRegisterBlock(src: unknown): RegisterSnapshot {
  const block = asRecord(src);
  if (!block) return emptyBlock();
  return {
    timestamp: pickTimestamp(block),
    registers: pickRegisters(asRecord(block.registers) ?? block),
    rowFound: block.rowFound === true,
  };
}

function pickRtuField(
  src: Record<string, unknown> | undefined,
  key: (typeof RTU_COUNTER_KEYS)[number],
): number | undefined {
  if (!src || !(key in src)) return undefined;
  const raw = src[key];
  if (raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function isV2Packet(root: Record<string, unknown>): boolean {
  const controllers = asRecord(root.controllers);
  return Boolean(controllers && asRecord(controllers.main));
}

function normalizeV2(root: Record<string, unknown>): NormalizedDeviceData {
  const controllers = asRecord(root.controllers)!;
  const main = asRecord(controllers.main)!;
  const jockey = asRecord(controllers.jockey)!;

  return {
    format: 'v2',
    fetchedAt: typeof root.fetchedAt === 'string' ? root.fetchedAt : null,
    deviceId: typeof root.deviceId === 'number' ? root.deviceId : Number(root.deviceId) || null,
    mainControllerType: typeof main.controllerType === 'string' ? main.controllerType : null,
    jockeyControllerType: typeof jockey.controllerType === 'string' ? jockey.controllerType : null,
    main: {
      trending: parseRegisterBlock(main.trending),
      historical: parseRegisterBlock(main.historical),
    },
    jockey: {
      trending: parseRegisterBlock(jockey.trending),
      historical: parseRegisterBlock(jockey.historical),
    },
  };
}

/**
 * Legacy `{ rtu, tcp }` shape — all registers treated as trending.
 */
function normalizeLegacy(root: Record<string, unknown>): NormalizedDeviceData {
  const rtuSrc = asRecord(root.rtu);
  const tcpSrc = asRecord(root.tcp);
  const mainRegisters = { ...pickRegisters(rtuSrc), ...pickRegisters(tcpSrc) };

  const jockeyRegisters: Record<string, number> = {};
  const rhrs = pickRtuField(rtuSrc, 'rhrs');
  const stop = pickRtuField(rtuSrc, 'stop');
  const start = pickRtuField(rtuSrc, 'start');
  const status =
    pickRtuField(rtuSrc, 'status') ??
    (JOCKEY_RTU_STATUS_REG in mainRegisters ? mainRegisters[JOCKEY_RTU_STATUS_REG] : undefined);

  if (rhrs !== undefined) jockeyRegisters['rhrs'] = rhrs;
  if (stop !== undefined) jockeyRegisters['stop'] = stop;
  if (start !== undefined) jockeyRegisters['start'] = start;
  if (status !== undefined) jockeyRegisters[JOCKEY_RTU_STATUS_REG] = status;

  const jockeyDischarge = mainRegisters['18'];
  if (jockeyDischarge !== undefined) {
    jockeyRegisters['18'] = jockeyDischarge;
    delete mainRegisters['18'];
  }
  if (status !== undefined && JOCKEY_RTU_STATUS_REG in mainRegisters) {
    delete mainRegisters[JOCKEY_RTU_STATUS_REG];
  }

  return {
    format: 'legacy',
    fetchedAt: null,
    deviceId: typeof root.deviceid === 'number' ? root.deviceid : Number(root.deviceid) || null,
    mainControllerType: null,
    jockeyControllerType: null,
    main: {
      trending: { timestamp: null, registers: mainRegisters },
      historical: emptyBlock(),
    },
    jockey: {
      trending: { timestamp: null, registers: jockeyRegisters },
      historical: emptyBlock(),
    },
  };
}

/**
 * Normalize API or pasted JSON into trending + historical blocks per controller.
 */
export function normalizePacket(raw: unknown): NormalizedDeviceData {
  const root = asRecord(raw) ?? {};
  if (isV2Packet(root)) return normalizeV2(root);
  return normalizeLegacy(root);
}

export function getMergedRegister(
  blocks: ControllerBlocks,
  reg: string,
): number | undefined {
  if (Object.prototype.hasOwnProperty.call(blocks.trending.registers, reg)) {
    return blocks.trending.registers[reg];
  }
  if (Object.prototype.hasOwnProperty.call(blocks.historical.registers, reg)) {
    return blocks.historical.registers[reg];
  }
  return undefined;
}

export function hasMergedRegister(blocks: ControllerBlocks, reg: string): boolean {
  return getMergedRegister(blocks, reg) !== undefined;
}

/** @deprecated Use hasMergedRegister on main blocks */
export function hasTcpRegister(packet: { main: ControllerBlocks }, reg: string): boolean {
  return hasMergedRegister(packet.main, reg);
}

/** Jockey legacy RTU counter stored under symbolic keys in trending block. */
export function getJockeyRtuField(
  blocks: ControllerBlocks,
  field: 'rhrs' | 'stop' | 'start',
): number | undefined {
  const raw = blocks.trending.registers[field] ?? blocks.historical.registers[field];
  return raw !== undefined && Number.isFinite(raw) ? raw : undefined;
}

export function hasJockeyStatus(blocks: ControllerBlocks): boolean {
  return hasMergedRegister(blocks, JOCKEY_RTU_STATUS_REG);
}
