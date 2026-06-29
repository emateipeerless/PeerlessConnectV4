import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AdcInputReading,
  AnalogReading,
  FirePumpSnapshot,
  HistoricalEvent,
  HistoricalMetric,
  StatusItem,
  SwitchMode,
} from '../types/m3d';
import { saveAnalogScales } from '../api/client';
import { parseScaleLimits, scaleAdcToValue } from '../lib/adcScaling';
import { getAnalogChannelLabel, getAnalogChannelUnit, getAnalogGaugeStyle } from '../lib/analogTemplates';
import { EngineeringGauge } from './EngineeringGauge';
import { SummaryAnalogGauges } from './SummaryAnalogGauges';
import { useAnalogScales, type AnalogScalesState } from '../hooks/useAnalogScales';
import { CONTROLLER_OFFLINE_MESSAGE } from '../lib/controllerOffline';
import { formatTimestamp } from '../lib/formatTimestamp';
import { Lamp } from './StatusBadge';
import { SwitchPositionDisplay } from './SwitchPositionDisplay';
import type { DataTimestamps } from '../types/m3d';

type DashboardTab = 'summary' | 'main' | 'jockey' | 'analog';

const DASHBOARD_TABS: {
  id: DashboardTab;
  title: string;
  subtitle: string;
}[] = [
  { id: 'summary', title: 'Summary', subtitle: 'At a glance' },
  { id: 'main', title: 'Main Pump', subtitle: 'Controller & alarms' },
  { id: 'jockey', title: 'Jockey Pump', subtitle: 'Status & stats' },
  { id: 'analog', title: 'Analog', subtitle: 'ADC inputs' },
];

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
  deviceId: number;
  snapshot: FirePumpSnapshot;
  lastRefresh?: Date | null;
  isRefreshing?: boolean;
  refreshIntervalMs?: number;
  isLive?: boolean;
};

export function FirePumpDashboard({
  deviceId,
  snapshot,
  lastRefresh,
  isRefreshing = false,
  refreshIntervalMs = 7000,
  isLive = false,
}: FirePumpDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('summary');
  const analogScales = useAnalogScales(deviceId);
  const { mainPump, jockeyPump, mainTimestamps, jockeyTimestamps } = snapshot;
  const mainTroubles = mainPump.alarms.filter((a) => a.active && !a.okWhenActive);
  const jockeyTroubles = jockeyPump.status.filter((a) => a.active && !a.okWhenActive);
  const discharge = mainPump.analog.systemDischargePressure;
  const dischargeLow = mainPump.alarms.find((a) => a.id === snapshot.lowPressureAlarmId)?.active;
  const analogReadings = mainPump.analogs.filter(
    (a) => a.id !== 'system-discharge-pressure' && a.id !== 'discharge-pressure',
  );

  return (
    <div className="dashboard dashboard--tabbed">
      <div className="device-tab-toolbar">
        <nav className="device-tab-bar" aria-label="Device views">
          <ul className="device-tab-bar__list" role="tablist">
            {DASHBOARD_TABS.map((tab) => (
              <li key={tab.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  className={`device-tab-bar__tab ${activeTab === tab.id ? 'device-tab-bar__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-selected={activeTab === tab.id}
                >
                  <span className="device-tab-bar__tab-title">{tab.title}</span>
                  <span className="device-tab-bar__tab-subtitle">{tab.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="device-tab-toolbar__meta">
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
      </div>

      <div className="dashboard__content">
        {activeTab === 'summary' && (
          <DashboardSummary
            snapshot={snapshot}
            analogScales={analogScales}
            mainTroubles={mainTroubles.length}
            jockeyTroubles={jockeyTroubles.length}
          />
        )}

        {activeTab === 'main' && (
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
        )}

        {activeTab === 'jockey' && (
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
        )}

        {activeTab === 'analog' && (
          <AdcInputsPanel
            deviceId={deviceId}
            inputs={snapshot.adcInputs}
            timestamp={snapshot.adcTimestamp}
            analogScales={analogScales}
          />
        )}
      </div>
    </div>
  );
}

function findStatus(items: StatusItem[], labelNeedles: string[]): StatusItem | undefined {
  const needles = labelNeedles.map((needle) => needle.toLowerCase());
  return items.find((item) => needles.some((needle) => item.label.toLowerCase().includes(needle)));
}

function findStatuses(items: StatusItem[], labelNeedles: readonly string[]): StatusItem[] {
  return labelNeedles
    .map((needle) => findStatus(items, [needle]))
    .filter((item): item is StatusItem => item !== undefined);
}

const DIESEL_SUMMARY_STATUS_NEEDLES = [
  'engine failed to start',
  'battery #1 trouble',
  'battery #2 trouble',
  'ecm failure',
  'engine overspeed',
] as const;

const ELECTRIC_SUMMARY_STATUS_NEEDLES = [
  'fail to start',
  'interlock on',
  'phase failure',
  'phase reversal',
  'transfer switch emergency',
] as const;

function acPowerOffLamp(items: StatusItem[]): StatusItem | undefined {
  const powerOn = findStatus(items, ['power on', 'ac power on']);
  if (!powerOn) return undefined;

  return {
    ...powerOn,
    id: `${powerOn.id}-off`,
    label: 'AC Power Off',
    active: !powerOn.active,
    okWhenActive: false,
  };
}

function DashboardSummary({
  snapshot,
  analogScales,
  mainTroubles,
  jockeyTroubles,
}: {
  snapshot: FirePumpSnapshot;
  analogScales: AnalogScalesState;
  mainTroubles: number;
  jockeyTroubles: number;
}) {
  const { mainPump, jockeyPump } = snapshot;
  const isDiesel = snapshot.profileId === 'mk3-diesel-fcjc';
  const mainPower = findStatus(mainPump.alarms, ['ac power on', 'power on']);
  const mainRunning = findStatus(mainPump.alarms, ['pump running', 'engine running']);
  const jockeyRunning = findStatus(jockeyPump.status, ['jockey pump running', 'pump running']);
  const jockeyPower = findStatus(jockeyPump.status, ['jockey power available', 'power available']);
  const isElectric = snapshot.profileId === 'mk3-electric-ftjp';
  const mainStatusLamps = isElectric
    ? [
        acPowerOffLamp(mainPump.alarms),
        ...findStatuses(mainPump.alarms, ELECTRIC_SUMMARY_STATUS_NEEDLES),
      ].filter((item): item is StatusItem => item !== undefined)
    : findStatuses(mainPump.alarms, DIESEL_SUMMARY_STATUS_NEEDLES);
  const mainSummaryLamps = [mainPower, mainRunning, ...mainStatusLamps].filter(
    (item): item is StatusItem => item !== undefined,
  );
  const jockeySummaryLamps = [jockeyPower, jockeyRunning].filter(
    (item): item is StatusItem => item !== undefined,
  );

  return (
    <section className="summary-section">
      <div className="summary-section__header">
        <h2 className="summary-section__title">Summary</h2>
        <p className="summary-section__subtitle">Main and jockey pump status at a glance.</p>
      </div>

      <div className="summary-columns">
        <div className="summary-column summary-column--main">
          <SummaryCard title="Main Pump" offline={snapshot.mainControllerOffline} troubles={mainTroubles}>
            <SummaryAnalogGauges
              placement="main-pump"
              adcInputs={snapshot.adcInputs}
              analogScales={analogScales}
              isDiesel={isDiesel}
              dischargePressure={mainPump.analog.systemDischargePressure}
              mainControllerOffline={snapshot.mainControllerOffline}
            />
            {snapshot.mainSwitchAvailable && (
              <SummarySwitch label="Switch Position" mode={mainPump.switchMode} />
            )}
            {mainSummaryLamps.length > 0 && (
              <div className="status-lamp-grid">
                {mainSummaryLamps.map((item) => (
                  <SummaryLamp key={item.id} item={item} />
                ))}
              </div>
            )}
          </SummaryCard>

          <SummaryAnalogGauges
            placement="bottom"
            adcInputs={snapshot.adcInputs}
            analogScales={analogScales}
            isDiesel={isDiesel}
            dischargePressure={mainPump.analog.systemDischargePressure}
            mainControllerOffline={snapshot.mainControllerOffline}
          />
        </div>

        <div className="summary-column summary-column--jockey">
          <SummaryCard title="Jockey Pump" offline={snapshot.jockeyControllerOffline} troubles={jockeyTroubles}>
            <SummarySwitch
              label="Switch Position"
              mode={jockeyPump.switchMode}
              unavailable={!jockeyPump.hasStatusRegister}
            />
            {jockeySummaryLamps.length > 0 && (
              <div className="status-lamp-grid">
                {jockeySummaryLamps.map((item) => (
                  <SummaryLamp key={item.id} item={item} />
                ))}
              </div>
            )}
          </SummaryCard>

          <SummaryEventLogPlaceholder />
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  title,
  offline,
  troubles,
  children,
}: {
  title: string;
  offline?: boolean;
  troubles?: number;
  children: ReactNode;
}) {
  return (
    <article className="summary-card panel">
      <div className="summary-card__header">
        <h3>{title}</h3>
        <div className="summary-card__badges">
          {offline && <span className="summary-card__badge summary-card__badge--warn">Offline</span>}
          {typeof troubles === 'number' && troubles > 0 && (
            <span className="summary-card__badge summary-card__badge--warn">{troubles} trouble</span>
          )}
        </div>
      </div>
      <div className="summary-card__body">{children}</div>
    </article>
  );
}

function SummarySwitch({
  label,
  mode,
  unavailable,
}: {
  label: string;
  mode: SwitchMode;
  unavailable?: boolean;
}) {
  return (
    <div className="summary-switch">
      <span className="summary-switch__label">{label}</span>
      {unavailable ? (
        <span className="summary-switch__value">Unavailable</span>
      ) : (
        <SwitchPositionDisplay mode={mode} label={label} />
      )}
    </div>
  );
}

function SummaryLamp({ item }: { item: StatusItem }) {
  return (
    <Lamp
      label={item.label}
      active={item.active}
      variant={item.active ? (item.okWhenActive ? 'ok' : 'alarm') : 'default'}
    />
  );
}

function SummaryEventLogPlaceholder() {
  return (
    <article className="summary-event-log panel">
      <div className="summary-event-log__header">
        <h3 className="summary-event-log__title">Event Log</h3>
        <span className="summary-event-log__badge">Coming soon</span>
      </div>
      <div className="summary-event-log__scroll" tabIndex={0}>
        <p className="summary-event-log__placeholder">
          Scrollable event history will appear here when live alarm and status events are wired in.
        </p>
      </div>
    </article>
  );
}

function AdcInputsPanel({
  deviceId,
  inputs,
  timestamp,
  analogScales,
}: {
  deviceId: number;
  inputs: AdcInputReading[];
  timestamp: string | null;
  analogScales: AnalogScalesState;
}) {
  const {
    templateId,
    setTemplateId,
    scalingRows,
    setScalingRows,
    isLoading,
    loadError,
    parsedTemplateId,
  } = analogScales;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setSaveError(null);
    setSaveMessage(null);
  }, [deviceId]);

  const rawByChannel = Object.fromEntries(inputs.map((input) => [input.channel, input.rawValue]));

  const tableRows = Array.from({ length: 8 }, (_, channel) => ({
    channel,
    label: `Analog Input ${channel + 1}`,
    rawValue: rawByChannel[channel] ?? null,
  }));

  const scaledReadings = useMemo(
    () =>
      tableRows.map((row) => {
        const limits = parseScaleLimits(scalingRows[row.channel]);
        const scaledValue =
          row.rawValue !== null && limits !== null
            ? scaleAdcToValue(row.rawValue, limits)
            : null;

        return {
          ...row,
          scaledValue,
          hasScale: limits !== null,
        };
      }),
    [tableRows, scalingRows],
  );

  function updateScalingRow(
    channel: number,
    field: 'adcMin' | 'adcMax' | 'valueMin' | 'valueMax',
    value: string,
  ) {
    if (!/^-?\d*$/.test(value)) return;

    setScalingRows((current) =>
      current.map((row, index) => (index === channel ? { ...row, [field]: value } : row)),
    );
  }

  async function handleSaveTemplate() {
    setSaveError(null);
    setSaveMessage(null);

    if (!templateId.trim()) {
      setSaveError('Template ID is required.');
      return;
    }

    const template = Number(templateId);
    if (!Number.isInteger(template)) {
      setSaveError('Template ID must be an integer.');
      return;
    }

    const channels: Array<{
      adcMin: number;
      adcMax: number;
      valueMin: number;
      valueMax: number;
    }> = [];

    try {
      for (let index = 0; index < scalingRows.length; index += 1) {
        const row = scalingRows[index];
        const fields = ['adcMin', 'adcMax', 'valueMin', 'valueMax'] as const;
        const parsed = {} as {
          adcMin: number;
          adcMax: number;
          valueMin: number;
          valueMax: number;
        };

        for (const field of fields) {
          const raw = row[field].trim();
          if (!raw) {
            throw new Error(`Analog Input ${index + 1}: ${field} is required.`);
          }
          const value = Number(raw);
          if (!Number.isInteger(value)) {
            throw new Error(`Analog Input ${index + 1}: ${field} must be an integer.`);
          }
          parsed[field] = value;
        }

        channels.push(parsed);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid scaling values';
      setSaveError(message);
      return;
    }

    try {
      setIsSaving(true);
      const result = await saveAnalogScales({ deviceId, template, channels });
      setSaveMessage(result.message ?? 'Analog scales saved.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save analog scales';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="pump-section pump-section--adc">
      <div className="pump-section__header">
        <div>
          <h2 className="pump-section__title">Analog Inputs</h2>
        </div>
        {timestamp ? (
          <span className="meta-pill meta-pill--muted meta-pill--tiny">
            Updated {formatTimestamp(timestamp)}
          </span>
        ) : null}
      </div>

      <div className="panel adc-scaling-panel">
        <div className="adc-scaling-panel__toolbar">
          <div className="adc-scaling-panel__template-field">
            <label className="adc-scaling-panel__template-label" htmlFor="analog-template-id">
              Template ID
            </label>
            <input
              id="analog-template-id"
              className="adc-scaling-panel__template-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={templateId}
              onChange={(event) => {
                const value = event.target.value;
                if (/^\d*$/.test(value)) setTemplateId(value);
              }}
              placeholder="e.g. 1"
              disabled={isLoading || isSaving}
            />
          </div>
          <button
            type="button"
            className="adc-scaling-panel__save"
            onClick={() => {
              void handleSaveTemplate();
            }}
            disabled={isLoading || isSaving}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {loadError && <p className="adc-scaling-panel__hint adc-scaling-panel__hint--error">{loadError}</p>}
        {saveError && <p className="adc-scaling-panel__hint adc-scaling-panel__hint--error">{saveError}</p>}
        {saveMessage && <p className="adc-scaling-panel__hint adc-scaling-panel__hint--success">{saveMessage}</p>}
        {isLoading && <p className="adc-scaling-panel__hint">Loading saved scaling values…</p>}

        <div className="adc-scaling-table-wrap">
          <table className="adc-scaling-table">
            <thead>
              <tr>
                <th scope="col">Input</th>
                <th scope="col">Current ADC</th>
                <th scope="col">ADC Min</th>
                <th scope="col">ADC Max</th>
                <th scope="col">Value Min</th>
                <th scope="col">Value Max</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.channel}>
                  <th scope="row" className="adc-scaling-table__input-name">
                    {row.label}
                  </th>
                  <td className="adc-scaling-table__current">
                    {row.rawValue !== null ? row.rawValue : '—'}
                  </td>
                  <td>
                    <input
                      className="adc-scaling-table__field"
                      type="text"
                      inputMode="numeric"
                      pattern="-?[0-9]*"
                      value={scalingRows[row.channel].adcMin}
                      onChange={(event) => updateScalingRow(row.channel, 'adcMin', event.target.value)}
                      aria-label={`${row.label} ADC Min`}
                      disabled={isLoading || isSaving}
                    />
                  </td>
                  <td>
                    <input
                      className="adc-scaling-table__field"
                      type="text"
                      inputMode="numeric"
                      pattern="-?[0-9]*"
                      value={scalingRows[row.channel].adcMax}
                      onChange={(event) => updateScalingRow(row.channel, 'adcMax', event.target.value)}
                      disabled={isLoading || isSaving}
                      aria-label={`${row.label} ADC Max`}
                    />
                  </td>
                  <td>
                    <input
                      className="adc-scaling-table__field"
                      type="text"
                      inputMode="numeric"
                      pattern="-?[0-9]*"
                      value={scalingRows[row.channel].valueMin}
                      onChange={(event) => updateScalingRow(row.channel, 'valueMin', event.target.value)}
                      aria-label={`${row.label} Value Min`}
                      disabled={isLoading || isSaving}
                    />
                  </td>
                  <td>
                    <input
                      className="adc-scaling-table__field"
                      type="text"
                      inputMode="numeric"
                      pattern="-?[0-9]*"
                      value={scalingRows[row.channel].valueMax}
                      onChange={(event) => updateScalingRow(row.channel, 'valueMax', event.target.value)}
                      aria-label={`${row.label} Value Max`}
                      disabled={isLoading || isSaving}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {inputs.length === 0 && (
          <p className="adc-scaling-panel__hint">No live ADC readings in the latest packet.</p>
        )}
      </div>

      <div className="panel adc-gauge-panel">
        <div className="adc-gauge-panel__header">
          <h3 className="adc-gauge-panel__title">Engineering Gauges</h3>
          <p className="adc-gauge-panel__subtitle">
            {parsedTemplateId !== null
              ? `Template ${parsedTemplateId} channel labels · scaled from Value Min / Max`
              : 'Set a template ID to show standardized channel names'}
          </p>
        </div>

        <div className="engineering-gauge-grid">
          {scaledReadings.map((row) => {
            const limits = parseScaleLimits(scalingRows[row.channel]);
            return (
              <EngineeringGauge
                key={row.channel}
                label={getAnalogChannelLabel(parsedTemplateId, row.channel)}
                style={getAnalogGaugeStyle(parsedTemplateId, row.channel)}
                unit={getAnalogChannelUnit(parsedTemplateId, row.channel)}
                value={row.scaledValue}
                valueMin={limits?.valueMin ?? 0}
                valueMax={limits?.valueMax ?? 100}
                configured={limits !== null}
              />
            );
          })}
        </div>
      </div>
    </section>
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
