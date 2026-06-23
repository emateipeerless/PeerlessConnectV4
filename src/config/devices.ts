export type DeviceProfileId = 'mk3-diesel-fcjc' | 'mk3-electric-ftjp';

export type DeviceTab = {
  id: number;
  profileId: DeviceProfileId;
  label: string;
  subtitle: string;
};

export const DEVICE_TABS: DeviceTab[] = [
  {
    id: 123,
    profileId: 'mk3-diesel-fcjc',
    label: 'Device 123',
    subtitle: 'MK3 Diesel · FCJC',
  },
  {
    id: 124,
    profileId: 'mk3-electric-ftjp',
    label: 'Device 124',
    subtitle: 'MK3 Electric · FTJP',
  },
];

export function getDeviceTab(deviceId: number): DeviceTab | undefined {
  return DEVICE_TABS.find((d) => d.id === deviceId);
}

export function getProfileIdForDevice(deviceId: number): DeviceProfileId {
  return getDeviceTab(deviceId)?.profileId ?? 'mk3-diesel-fcjc';
}

/** Replace or append `deviceid` on the API base URL. */
export function buildPacketApiUrl(baseUrl: string, deviceId: number): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('deviceid', String(deviceId));
    return url.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}deviceid=${deviceId}`;
  }
}
