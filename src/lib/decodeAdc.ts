import type { AdcInputReading } from '../types/m3d';
import type { NormalizedDeviceData } from '../types/devicePacket';
import { isAdcInSensorSpan, rawAdcToMilliamps } from './adcConversion';

/** Map API ADC channels 0-7 to raw counts and 4–20 mA values. */
export function decodeAdcInputs(data: NormalizedDeviceData): AdcInputReading[] {
  const channels = data.adc?.channels;
  if (!channels) return [];

  return Object.keys(channels)
    .sort((a, b) => Number(a) - Number(b))
    .map((channel) => {
      const rawValue = channels[channel];
      const channelNumber = Number(channel);
      const milliamps = rawAdcToMilliamps(rawValue);

      return {
        id: `adc-${channel}`,
        channel: channelNumber,
        label: `Analog Input ${channelNumber + 1}`,
        rawValue,
        milliamps,
        inSensorSpan: isAdcInSensorSpan(milliamps),
      };
    });
}
