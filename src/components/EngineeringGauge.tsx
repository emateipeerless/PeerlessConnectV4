import { formatScaledValue } from '../lib/adcScaling';
import type { AnalogGaugeStyle } from '../lib/analogTemplates';
import type { ReactNode } from 'react';

const DEFAULT_TICK_COUNT = 5;
const ARC_CX = 100;
const ARC_CY = 96;
const ARC_RADIUS = 72;
const ARC_NEEDLE_LENGTH = 58;

function buildTicks(valueMin: number, valueMax: number, tickCount = DEFAULT_TICK_COUNT): number[] {
  if (tickCount < 2 || valueMax === valueMin) {
    return [valueMin];
  }

  return Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    return valueMin + ratio * (valueMax - valueMin);
  });
}

function valueRatio(value: number, valueMin: number, valueMax: number): number {
  if (valueMax === valueMin) return 0;
  const ratio = (value - valueMin) / (valueMax - valueMin);
  return Math.min(1, Math.max(0, ratio));
}

function tickPositionPercent(value: number, valueMin: number, valueMax: number): number {
  return valueRatio(value, valueMin, valueMax) * 100;
}

function arcPoint(ratio: number, radius = ARC_RADIUS): { x: number; y: number } {
  const angleDeg = 180 - ratio * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: ARC_CX + radius * Math.cos(angleRad),
    y: ARC_CY - radius * Math.sin(angleRad),
  };
}

function arcPath(startRatio: number, endRatio: number, radius = ARC_RADIUS): string {
  const start = arcPoint(startRatio, radius);
  const end = arcPoint(endRatio, radius);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

export interface EngineeringGaugeProps {
  label: string;
  value: number | null;
  valueMin: number;
  valueMax: number;
  unit?: string;
  configured?: boolean;
  disconnected?: boolean;
  style?: AnalogGaugeStyle;
  size?: 'default' | 'compact';
}

function gaugeSizeClass(size: 'default' | 'compact' = 'default'): string {
  return size === 'compact' ? 'engineering-gauge--compact' : '';
}

function GaugeValue({
  configured,
  disconnected = false,
  value,
  unit,
}: {
  configured: boolean;
  disconnected?: boolean;
  value: number | null;
  unit?: string;
}) {
  if (disconnected) {
    return <p className="engineering-gauge__value engineering-gauge__value--disconnected">Not connected</p>;
  }

  if (!configured || value === null) {
    return <p className="engineering-gauge__value">—</p>;
  }

  return (
    <p className="engineering-gauge__value">
      {formatScaledValue(value)}
      {unit && <span className="engineering-gauge__unit">{unit}</span>}
    </p>
  );
}

export function EngineeringGauge({
  style = 'arc',
  size = 'default',
  ...props
}: EngineeringGaugeProps) {
  if (style === 'tank') {
    return <TankLevelGauge size={size} {...props} />;
  }

  if (style === 'temperature') {
    return <TemperatureGauge size={size} {...props} />;
  }

  return <ArcGauge size={size} {...props} />;
}

function gaugeStateClass(configured: boolean, disconnected = false): string {
  if (disconnected) return 'engineering-gauge--disconnected';
  if (!configured) return 'engineering-gauge--unconfigured';
  return '';
}

function VerticalTrackTicks({
  valueMin,
  valueMax,
}: {
  valueMin: number;
  valueMax: number;
}) {
  const ticks = buildTicks(valueMin, valueMax);

  return (
    <div className="engineering-gauge__vertical-ticks" aria-hidden="true">
      {ticks.map((tick) => (
        <div
          key={tick}
          className="engineering-gauge__vertical-tick"
          style={{ bottom: `${tickPositionPercent(tick, valueMin, valueMax)}%` }}
        >
          <span className="engineering-gauge__vertical-tick-label">{formatScaledValue(tick)}</span>
          <span className="engineering-gauge__vertical-tick-mark" />
        </div>
      ))}
    </div>
  );
}

function VerticalTrack({
  valueMin,
  valueMax,
  fillPercent,
  variant,
  children,
}: {
  valueMin: number;
  valueMax: number;
  fillPercent: number | null;
  variant: 'tank' | 'temperature';
  children?: ReactNode;
}) {
  return (
    <div className={`engineering-gauge__track-wrap engineering-gauge__track-wrap--${variant}`}>
      <VerticalTrackTicks valueMin={valueMin} valueMax={valueMax} />
      <div className="engineering-gauge__track">
        {fillPercent !== null && (
          <div className="engineering-gauge__fill" style={{ height: `${fillPercent}%` }} />
        )}
        {variant === 'tank' && fillPercent !== null && (
          <div className="engineering-gauge__indicator" style={{ bottom: `${fillPercent}%` }} />
        )}
        {children}
      </div>
    </div>
  );
}

function TankLevelGauge({
  label,
  value,
  valueMin,
  valueMax,
  unit,
  configured = true,
  disconnected = false,
  size = 'default',
}: Omit<EngineeringGaugeProps, 'style'>) {
  const showReading = !disconnected && configured;
  const fillPercent =
    showReading && value !== null ? tickPositionPercent(value, valueMin, valueMax) : null;

  return (
    <article
      className={`engineering-gauge engineering-gauge--tank ${gaugeStateClass(configured, disconnected)} ${gaugeSizeClass(size)}`}
    >
      <h4 className="engineering-gauge__label">{label}</h4>

      <div className="engineering-gauge__tank-body">
        <VerticalTrack
          valueMin={valueMin}
          valueMax={valueMax}
          fillPercent={fillPercent}
          variant="tank"
        />
      </div>

      <GaugeValue configured={configured} disconnected={disconnected} value={value} unit={unit} />
    </article>
  );
}

function TemperatureGauge({
  label,
  value,
  valueMin,
  valueMax,
  unit,
  configured = true,
  disconnected = false,
  size = 'default',
}: Omit<EngineeringGaugeProps, 'style'>) {
  const showReading = !disconnected && configured;
  const fillPercent =
    showReading && value !== null ? tickPositionPercent(value, valueMin, valueMax) : null;

  return (
    <article
      className={`engineering-gauge engineering-gauge--temperature ${gaugeStateClass(configured, disconnected)} ${gaugeSizeClass(size)}`}
    >
      <h4 className="engineering-gauge__label">{label}</h4>

      <div className="engineering-gauge__temp-body">
        <div className="engineering-gauge__thermometer">
          <VerticalTrack
            valueMin={valueMin}
            valueMax={valueMax}
            fillPercent={fillPercent}
            variant="temperature"
          />
          <div className="engineering-gauge__bulb" />
        </div>
      </div>

      <GaugeValue configured={configured} disconnected={disconnected} value={value} unit={unit} />
    </article>
  );
}

function ArcGauge({
  label,
  value,
  valueMin,
  valueMax,
  unit,
  configured = true,
  disconnected = false,
  size = 'default',
}: Omit<EngineeringGaugeProps, 'style'>) {
  const ticks = buildTicks(valueMin, valueMax);
  const showReading = !disconnected && configured;
  const ratio = showReading && value !== null ? valueRatio(value, valueMin, valueMax) : null;
  const needle = ratio !== null ? arcPoint(ratio, ARC_NEEDLE_LENGTH) : null;
  const trackPath = arcPath(0, 1);
  const valuePath = ratio !== null && ratio > 0 ? arcPath(0, ratio) : '';

  return (
    <article
      className={`engineering-gauge engineering-gauge--arc ${gaugeStateClass(configured, disconnected)} ${gaugeSizeClass(size)}`}
    >
      <h4 className="engineering-gauge__label">{label}</h4>

      <svg
        viewBox="0 0 200 112"
        className="engineering-gauge__arc-svg"
        role="img"
        aria-label={`${label} gauge`}
      >
        <path d={trackPath} className="engineering-gauge__arc-track" />
        {valuePath && <path d={valuePath} className="engineering-gauge__arc-value" />}

        {ticks.map((tick) => {
          const tickRatio = valueRatio(tick, valueMin, valueMax);
          const outer = arcPoint(tickRatio, ARC_RADIUS + 5);
          const inner = arcPoint(tickRatio, ARC_RADIUS - 9);
          const labelPoint = arcPoint(tickRatio, ARC_RADIUS - 22);

          return (
            <g key={tick}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                className="engineering-gauge__arc-tick"
              />
              {size !== 'compact' && (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  className="engineering-gauge__arc-tick-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {formatScaledValue(tick)}
                </text>
              )}
            </g>
          );
        })}

        {needle && (
          <>
            <line
              x1={ARC_CX}
              y1={ARC_CY}
              x2={needle.x}
              y2={needle.y}
              className="engineering-gauge__needle"
            />
            <circle cx={ARC_CX} cy={ARC_CY} r={5} className="engineering-gauge__hub" />
          </>
        )}
      </svg>

      <GaugeValue configured={configured} disconnected={disconnected} value={value} unit={unit} />
    </article>
  );
}
