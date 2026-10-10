// src/components/ui/Switch.tsx

import styles from './Switch.module.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Texto visible al lado del switch */
  label?: string;
  /** Texto para lectores de pantalla cuando no hay label visible */
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

export const Switch = ({
  checked,
  onChange,
  disabled = false,
  label,
  ariaLabel,
  size = 'md',
}: SwitchProps) => {
  const wrapperClass = [styles.wrapper, disabled ? styles.disabled : '']
    .filter(Boolean)
    .join(' ');

  const trackClass = [styles.track, size === 'sm' ? styles.sm : '', checked ? styles.on : '']
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClass}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        className={trackClass}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
      {label && <span className={styles.text}>{label}</span>}
    </label>
  );
};