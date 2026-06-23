import type { DeviceApiPacket } from '../types/devicePacket';
import { sampleDevicePacket } from './samplePacket';
import { sampleDevicePacket124 } from './samplePacket124';

const SAMPLES: Record<number, DeviceApiPacket> = {
  123: sampleDevicePacket,
  124: sampleDevicePacket124,
};

export function getSamplePacketForDevice(deviceId: number): DeviceApiPacket {
  return SAMPLES[deviceId] ?? sampleDevicePacket;
}
