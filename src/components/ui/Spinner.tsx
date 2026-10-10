// src/components/ui/Spinner.tsx

import { cx } from '../../lib/cx';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Texto para lectores de pantalla. Pásalo vacío si el contenedor ya lo anuncia. */
  label?: string;
  className?: string;
}

export const Spinner = ({ size = 'md', label = 'Cargando', className }: SpinnerProps) => (
  <span
    className={cx(styles.spinner, styles[size], className)}
    role={label ? 'status' : undefined}
    aria-label={label || undefined}
    aria-hidden={label ? undefined : true}
  />
);