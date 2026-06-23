interface LoadingSpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({ label, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner--${size}`} role="status" aria-live="polite">
      <span className="loading-spinner__wheel" aria-hidden="true" />
      {label && <span className="loading-spinner__label">{label}</span>}
    </div>
  );
}
