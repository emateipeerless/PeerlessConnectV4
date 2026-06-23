import type { DeviceProfileId } from '../config/devices';
import { getProfileIdForDevice } from '../config/devices';
import type { FirePumpSnapshot } from '../types/m3d';
import type { NormalizedDeviceData } from '../types/devicePacket';
import { isControllerOfflineFromTrending } from './controllerOffline';
import { decodeDieselFcjcPacket } from './profiles/dieselFcjc/decode';
import { decodeElectricFtjpPacket } from './profiles/electricFtjp/decode';

export function resolveProfileId(data: NormalizedDeviceData): DeviceProfileId {
  if (data.mainControllerType === 'mk3electric' || data.jockeyControllerType === 'ftjp') {
    return 'mk3-electric-ftjp';
  }
  if (data.deviceId !== null) {
    return getProfileIdForDevice(data.deviceId);
  }
  return 'mk3-diesel-fcjc';
}

export function decodeDevicePacket(
  data: NormalizedDeviceData,
  receivedAt: Date = new Date(),
): FirePumpSnapshot {
  const profileId = resolveProfileId(data);
  const snapshot =
    profileId === 'mk3-electric-ftjp'
      ? decodeElectricFtjpPacket(data, receivedAt)
      : decodeDieselFcjcPacket(data, receivedAt);

  return {
    ...snapshot,
    mainControllerOffline: isControllerOfflineFromTrending(data.main),
    jockeyControllerOffline: isControllerOfflineFromTrending(data.jockey),
  };
}

/** @deprecated Use decodeDevicePacket */
export const decodeM3dPacket = decodeDevicePacket;
