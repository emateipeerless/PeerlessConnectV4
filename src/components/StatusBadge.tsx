import type { MainSwitchMode } from '../types/m3d';

const MODE_STYLES: Record<MainSwitchMode, string> = {
  OFF: 'badge--off',
  AUTO: 'badge--auto',
  MANUAL: 'badge--manual',
};

export function StatusBadge({ mode }: { mode: MainSwitchMode }) {
  return <span className={`badge ${MODE_STYLES[mode]}`}>{mode}</span>;
}

export function Lamp({
  active,
  label,
  variant = 'default',
}: {
  active: boolean;
  label: string;
  variant?: 'default' | 'ok' | 'alarm';
}) {
  const variantClass =
    variant === 'ok' ? 'lamp--ok' : variant === 'alarm' ? 'lamp--alarm' : '';

  return (
    <div
      className={`lamp ${active ? `lamp--on ${variantClass}` : 'lamp--off'}`}
      title={`${label}: ${active ? 'ON' : 'OFF'}`}
    >
      <span className="lamp__dot" />
      <span className="lamp__label">{label}</span>
    </div>
  );
}
