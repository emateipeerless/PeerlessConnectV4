import { useCallback, useEffect, useRef, useState } from 'react';
import { buildPacketApiUrl } from '../config/devices';
import { PACKET_API_URL, PACKET_REFRESH_MS } from '../config';
import { getSamplePacketForDevice } from '../data/samples';
import { normalizePacket } from '../lib/normalizePacket';
import type { NormalizedDeviceData } from '../types/devicePacket';

export function useDevicePacket(deviceId: number) {
  const [packet, setPacket] = useState<NormalizedDeviceData>(() =>
    normalizePacket(getSamplePacketForDevice(deviceId)),
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const apiUrl = PACKET_API_URL?.trim()
    ? buildPacketApiUrl(PACKET_API_URL.trim(), deviceId)
    : undefined;
  const isLive = Boolean(apiUrl);

  const refresh = useCallback(async () => {
    if (!apiUrl) {
      setPacket(normalizePacket(getSamplePacketForDevice(deviceId)));
      setLastRefresh(new Date());
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRefreshing(true);
    try {
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data: unknown = await response.json();
      setPacket(normalizePacket(data));
      setFetchError(null);
      setLastRefresh(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch packet');
    } finally {
      if (!controller.signal.aborted) {
        setIsRefreshing(false);
      }
    }
  }, [apiUrl, deviceId]);

  useEffect(() => {
    setPacket(normalizePacket(getSamplePacketForDevice(deviceId)));
    refresh();
    const intervalId = setInterval(refresh, PACKET_REFRESH_MS);
    return () => {
      clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [deviceId, refresh]);

  const setManualPacket = useCallback((json: string) => {
    setPacket(normalizePacket(JSON.parse(json)));
    setFetchError(null);
    setLastRefresh(new Date());
  }, []);

  return {
    packet,
    fetchError,
    lastRefresh,
    isRefreshing,
    isLive,
    apiUrl,
    refresh,
    setManualPacket,
    refreshIntervalMs: PACKET_REFRESH_MS,
  };
}
