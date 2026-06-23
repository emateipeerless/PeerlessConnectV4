import type { ControllerBlocks } from '../types/devicePacket';

export const CONTROLLER_OFFLINE_MESSAGE = 'Controller Unpowered or Communication error';

function allValuesZero(values: number[]): boolean {
  return values.length > 0 && values.every((v) => v === 0);
}

/**
 * Offline from fast (trending) registers only — used for low-latency detection.
 * Historical/slow packets may lag ~10 minutes and must not gate this state.
 */
export function isControllerOfflineFromTrending(blocks: ControllerBlocks): boolean {
  const trendingValues = Object.values(blocks.trending.registers);

  if (trendingValues.length === 0) {
    return true;
  }

  return allValuesZero(trendingValues);
}

/** @deprecated Use isControllerOfflineFromTrending */
export const isControllerOffline = isControllerOfflineFromTrending;
