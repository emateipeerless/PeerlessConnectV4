import type { SwitchMode } from '../types/m3d';

const MODES: SwitchMode[] = ['OFF', 'AUTO', 'MANUAL'];

export function SwitchPositionDisplay({
  mode,
  label = 'Switch position',
}: {
  mode: SwitchMode;
  label?: string;
}) {
  return (
    <div className="switch-position" role="group" aria-label={label}>
      {MODES.map((m) => (
        <span
          key={m}
          className={`switch-position__option ${m === mode ? 'switch-position__option--active' : ''}`}
          aria-current={m === mode ? 'true' : undefined}
        >
          {m}
        </span>
      ))}
    </div>
  );
}
