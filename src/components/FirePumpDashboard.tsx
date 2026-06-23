import type { ReactNode } from 'react';
import type {
  AnalogReading,
  FirePumpSnapshot,
  HistoricalEvent,
  HistoricalMetric,
  StatusItem,
  SwitchMode,
} from '../types/m3d';
import { CONTROLLER_OFFLINE_MESSAGE } from '../lib/controllerOffline';
import { Lamp } from './StatusBadge';
import { SwitchPositionDisplay } from './SwitchPositionDisplay';
import type { DataTimestamps } from '../types/m3d';

function SwitchPanel({
  mode,
  label,
  unavailable,
}: {
  mode: SwitchMode;
  label: string;
  unavailable?: boolean;
}) {
  return (
    <div className="panel panel--inline">
      <h3>Switch Position</h3>
      {unavailable ? (
        <p className="panel-unavailable">RTU status not in packet — will show OFF / AUTO / MANUAL when available.</p>
      ) : (
        <SwitchPositionDisplay mode={mode} label={label} />
      )}
    </div>
  );
}

function StatusLampPanel({
  title,
  items,
  troubleCount,
  unavailable,
}: {
  title: string;
  items: StatusItem[];
  troubleCount?: number;
  unavailable?: boolean;
}) {
  const troubles = troubleCount ?? items.filter((i) => i.active && !i.okWhenActive).length;

  return (
    <div className="panel">
      <div className="panel__title-row">
        <h3>{title}</h3>
        {!unavailable && (
          <span className={`alarm-summary ${troubles > 0 ? 'alarm-summary--warn' : ''}`}>
            {troubles} trouble
          </span>
        )}
      </div>
      {unavailable ? (
        <p className="panel-unavailable">Jockey status not in packet yet.</p>
      ) : (
        <div className="status-lamp-grid">
          {items.map((item) => (
            <Lamp
              key={item.id}
              label={item.label}
              active={item.active}
              variant={item.active ? (item.okWhenActive ? 'ok' : 'alarm') : 'default'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type FirePumpDashboardProps = {
  snapshot: FirePumpSnapshot;
  lastRefresh?: Date | null;
  isRefreshing?: boolean;
  refreshIntervalMs?: number;
  isLive?: boolean;
};

export function FirePumpDashboard({
  snapshot,
  lastRefresh,
  isRefreshing = false,
  refreshIntervalMs = 7000,
  isLive = false,
}: FirePumpDashboardProps) {
  const { mainPump, jockeyPump, mainTimestamps, jockeyTimestamps } = snapshot;
  const mainTroubles = mainPump.alarms.filter((a) => a.active && !a.okWhenActive);
  const jockeyTroubles = jockeyPump.status.filter((a) => a.active && !a.okWhenActive);
  const discharge = mainPump.analog.systemDischargePressure;
  const dischargeLow = mainPump.alarms.find((a) => a.id === snapshot.lowPressureAlarmId)?.active;
  const analogReadings = mainPump.analogs.filter(
    (a) => a.id !== 'system-discharge-pressure' && a.id !== 'discharge-pressure',
  );

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="dashboard__eyebrow">IoT Fire Pump Monitor</p>
          <h1>{snapshot.configurationLabel}</h1>
          {snapshot.deviceId !== null && <p className="dashboard__device">Device ID: {snapshot.deviceId}</p>}
        </div>
        <div className="dashboard__meta">
          <span className="meta-pill">{snapshot.controllerBadge}</span>
          {isLive && (
            <span className={`meta-pill ${isRefreshing ? 'meta-pill--pulse' : 'meta-pill--live'}`}>
              {isRefreshing ? 'Refreshing…' : `Live · ${refreshIntervalMs / 1000}s`}
            </span>
          )}
          <span className="meta-pill meta-pill--muted">
            Updated {(lastRefresh ?? new Date(snapshot.receivedAt)).toLocaleString()}
          </span>
        </div>
      </header>

      <PumpSection
        title="Main Pump"
        variant="main"
        offline={snapshot.mainControllerOffline}
        trending={mainTimestamps.trending}
        historical={mainTimestamps.historical}
      >
        <div className={`discharge-hero ${dischargeLow ? 'discharge-hero--low' : ''}`}>
          <p className="discharge-hero__label">System Discharge Pressure</p>
          <p className="discharge-hero__value">
            {formatValue(discharge, 1)}
            <span className="discharge-hero__unit">PSI</span>
          </p>
          {dischargeLow && <p className="discharge-hero__alert">Low pressure alarm active</p>}
        </div>

        {snapshot.mainSwitchAvailable && (
          <SwitchPanel mode={mainPump.switchMode} label="Main pump switch position" />
        )}

        {analogReadings.length > 0 && (
          <div className="panel">
            <h3>{snapshot.mainAnalogSectionTitle}</h3>
            <div className="metric-grid">
              {analogReadings.map((reading) => (
                <Metric key={reading.id} reading={reading} />
              ))}
            </div>
          </div>
        )}

        <StatusLampPanel title="Alarms / Status" items={mainPump.alarms} troubleCount={mainTroubles.length} />

        <HistoricalDataPanel metrics={mainPump.historicalMetrics} events={mainPump.historicalEvents} />
      </PumpSection>

      <PumpSection
        title="Jockey Pump"
        variant="jockey"
        offline={snapshot.jockeyControllerOffline}
        trending={jockeyTimestamps.trending}
        historical={jockeyTimestamps.historical}
      >
        {jockeyPump.hasDischargeRegister ? (
          <div className="discharge-hero discharge-hero--jockey">
            <p className="discharge-hero__label">Jockey Discharge</p>
            <p className="discharge-hero__value">
              {formatValue(jockeyPump.discharge ?? 0, 1)}
              <span className="discharge-hero__unit">PSI</span>
            </p>
          </div>
        ) : (
          <div className="panel panel--placeholder">
            <h3>Jockey Discharge</h3>
            <p className="panel-unavailable">Jockey discharge not in packet yet.</p>
          </div>
        )}

        <div className="pump-section__row">
          <SwitchPanel
            mode={jockeyPump.switchMode}
            label="Jockey pump switch position"
            unavailable={!jockeyPump.hasStatusRegister}
          />
          <div className="panel panel--inline">
            <h3>Operating Stats</h3>
            <div className="metric-grid metric-grid--compact metric-grid--operating">
              {jockeyPump.operatingMetrics.map((stat) => (
                <Metric
                  key={stat.id}
                  label={stat.label}
                  value={stat.value}
                  unit={stat.unit}
                  decimals={stat.decimals}
                  variant={stat.variant}
                />
              ))}
              <Metric label="Run Hours" value={jockeyPump.runHours} decimals={jockeyPump.runHoursDecimals} />
              <Metric label="Starts" value={jockeyPump.startCount} />
            </div>
          </div>
        </div>

        <StatusLampPanel
          title="Status"
          items={jockeyPump.status}
          troubleCount={jockeyTroubles.length}
          unavailable={!jockeyPump.hasStatusRegister}
        />
      </PumpSection>
    </div>
  );
}

function PumpSection({
  title,
  variant,
  offline,
  trending,
  historical,
  children,
}: {
  title: string;
  variant: 'main' | 'jockey';
  offline: boolean;
  trending: DataTimestamps['trending'];
  historical: DataTimestamps['historical'];
  children: ReactNode;
}) {
  return (
    <section className={`pump-section pump-section--${variant}`}>
      {offline && (
        <div className="controller-offline-overlay" role="alert">
          <p className="controller-offline-overlay__message">{CONTROLLER_OFFLINE_MESSAGE}</p>
        </div>
      )}
      <div className="pump-section__heading">
        <h2 className="pump-section__title">{title}</h2>
        <DataTimestampPanel trending={trending} historical={historical} />
      </div>
      {children}
    </section>
  );
}

function formatValue(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatTimestamp(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function DataTimestampPanel({
  trending,
  historical,
}: {
  trending: string | null;
  historical: string | null;
}) {
  return (
    <div className="timestamp-pills">
      <span className="meta-pill meta-pill--muted meta-pill--tiny">
        Trend: <span className="timestamp-pills__value">{formatTimestamp(trending)}</span>
      </span>
      <span className="meta-pill meta-pill--muted meta-pill--tiny">
        Hist: <span className="timestamp-pills__value">{formatTimestamp(historical)}</span>
      </span>
    </div>
  );
}

function HistoricalDataPanel({
  metrics,
  events,
}: {
  metrics: HistoricalMetric[];
  events: HistoricalEvent[];
}) {
  return (
    <>
      <div className="panel">
        <h3>Historical Metrics</h3>
        {metrics.length === 0 ? (
          <p className="panel-unavailable">No historical metrics in this packet.</p>
        ) : (
          <div className="metric-grid">
            {metrics.map((metric) => (
              <Metric key={metric.id} label={metric.label} value={metric.value} unit={metric.unit} decimals={metric.decimals} />
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Historical Events</h3>
        {events.length === 0 ? (
          <p className="panel-unavailable">No historical event timestamps in this packet.</p>
        ) : (
          <div className="event-grid">
            {events.map((event) => (
              <HistoricalEventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function HistoricalEventItem({ event }: { event: HistoricalEvent }) {
  return (
    <div className="event-item">
      <p className="event-item__title">{event.label}</p>
      <p className="event-item__date">{formatTimestamp(event.at)}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  reading,
  valueLabel,
  unit,
  decimals,
  variant,
}: {
  label?: string;
  value?: number;
  reading?: AnalogReading;
  valueLabel?: string;
  unit?: string;
  decimals?: number;
  variant?: 'pressure-setting';
}) {
  const displayLabel = reading?.label ?? label ?? '';
  const numericValue = reading?.value ?? value ?? 0;
  const displayValue = valueLabel ?? formatValue(numericValue, reading?.decimals ?? decimals ?? 0);
  const displayUnit = reading?.unit ?? unit;
  const metricClass =
    variant === 'pressure-setting' ? 'metric metric--pressure-setting' : 'metric';

  return (
    <div className={metricClass}>
      <span className="metric__label">{displayLabel}</span>
      <span className="metric__value">
        {displayValue}
        {displayUnit && <span className="metric__unit">{displayUnit}</span>}
      </span>
    </div>
  );
}
