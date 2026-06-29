import type { AdcInputReading } from '../types/m3d';
import {
  isAnalogInputConnected,
  parseScaleLimits,
  scaleAdcToValue,
} from '../lib/adcScaling';
import {
  getAnalogChannelUnit,
  SUMMARY_BOTTOM_GAUGES,
  SUMMARY_DISCHARGE_GAUGE_RANGE,
  SUMMARY_TOP_ARC_GAUGES,
} from '../lib/analogTemplates';
import type { AnalogGaugeStyle } from '../lib/analogTemplates';
import type { AnalogScalesState } from '../hooks/useAnalogScales';
import { EngineeringGauge } from './EngineeringGauge';

interface SummaryAnalogGaugesProps {
  adcInputs: AdcInputReading[];
  analogScales: AnalogScalesState;
  isDiesel: boolean;
  dischargePressure: number;
  mainControllerOffline: boolean;
  placement: 'main-pump' | 'bottom';
}

function rawByChannel(inputs: AdcInputReading[]): Record<number, number> {
  return Object.fromEntries(inputs.map((input) => [input.channel, input.rawValue]));
}

export function SummaryAnalogGauges({
  adcInputs,
  analogScales,
  isDiesel,
  dischargePressure,
  mainControllerOffline,
  placement,
}: SummaryAnalogGaugesProps) {
  const { scalingRows, parsedTemplateId, isLoading } = analogScales;
  const rawValues = rawByChannel(adcInputs);

  if (isLoading || parsedTemplateId === null) {
    return null;
  }

  function renderAnalogGauge(
    channel: number,
    label: string,
    style: AnalogGaugeStyle,
    compact: boolean,
  ) {
    const limits = parseScaleLimits(scalingRows[channel]);
    const rawValue = rawValues[channel] ?? null;
    const connected = isAnalogInputConnected(rawValue, limits);
    const scaledValue =
      connected && rawValue !== null && limits !== null
        ? scaleAdcToValue(rawValue, limits)
        : null;

    return (
      <EngineeringGauge
        key={`${channel}-${label}`}
        label={label}
        style={style}
        size={compact ? 'compact' : 'default'}
        unit={getAnalogChannelUnit(parsedTemplateId, channel)}
        value={scaledValue}
        valueMin={limits?.valueMin ?? 0}
        valueMax={limits?.valueMax ?? 100}
        configured={connected && limits !== null}
        disconnected={!connected}
      />
    );
  }

  if (placement === 'main-pump') {
    const topGauges = SUMMARY_TOP_ARC_GAUGES[parsedTemplateId] ?? [];
    if (topGauges.length === 0) return null;

    const dischargeConnected =
      !mainControllerOffline && Number.isFinite(dischargePressure);
    const [suctionGauge, ...otherTopGauges] = topGauges;

    return (
      <div className="summary-gauge-row summary-gauge-row--main-pump">
        {renderAnalogGauge(suctionGauge.channel, suctionGauge.label, 'arc', true)}
        <EngineeringGauge
          key="discharge-modbus"
          label="Discharge"
          style="arc"
          size="compact"
          unit="PSI"
          value={dischargeConnected ? dischargePressure : null}
          valueMin={SUMMARY_DISCHARGE_GAUGE_RANGE.min}
          valueMax={SUMMARY_DISCHARGE_GAUGE_RANGE.max}
          configured={dischargeConnected}
          disconnected={!dischargeConnected}
        />
        {otherTopGauges.map((gauge) =>
          renderAnalogGauge(gauge.channel, gauge.label, 'arc', true),
        )}
      </div>
    );
  }

  const bottomGauges = (SUMMARY_BOTTOM_GAUGES[parsedTemplateId] ?? []).filter(
    (gauge) => !gauge.dieselOnly || isDiesel,
  );

  if (bottomGauges.length === 0) return null;

  return (
    <div className="summary-gauge-row summary-gauge-row--bottom">
      {bottomGauges.map((gauge) =>
        renderAnalogGauge(
          gauge.channel,
          gauge.label,
          gauge.style,
          gauge.style === 'arc',
        ),
      )}
    </div>
  );
}
