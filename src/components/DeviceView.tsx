import { useMemo } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { FirePumpDashboard } from "./FirePumpDashboard";
import { decodeDevicePacket } from "../lib/decodeDevicePacket";
import { useDevicePacket } from "../hooks/useDevicePacket";

interface DeviceViewProps {
  deviceId: number;
  deviceName: string;
}

export function DeviceView({ deviceId, deviceName }: DeviceViewProps) {
  const { packet, fetchError, lastRefresh, isRefreshing, isLive, refreshIntervalMs } =
    useDevicePacket(deviceId);

  const snapshot = useMemo(() => decodeDevicePacket(packet), [packet]);

  return (
    <section className="device-view">
      <div className="device-view__header">
        <div>
          <p className="eyebrow">Device</p>
          <h2>{deviceName}</h2>
        </div>
        {fetchError && <p className="device-view__error">{fetchError}</p>}
        {!isLive && (
          <p className="device-view__hint">
            Set <code>VITE_PACKET_API_URL</code> in <code>.env</code> for live data.
          </p>
        )}
      </div>

      <ErrorBoundary>
        <FirePumpDashboard
          deviceId={deviceId}
          snapshot={snapshot}
          lastRefresh={lastRefresh}
          isRefreshing={isRefreshing}
          refreshIntervalMs={refreshIntervalMs}
          isLive={isLive}
        />
      </ErrorBoundary>
    </section>
  );
}
