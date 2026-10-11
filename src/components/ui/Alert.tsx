// src/components/ui/Alert.tsx

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { IconButton } from './IconButton';
import styles from './Alert.module.css';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const DEFAULT_ICONS: Record<AlertTone, string> = {
  info: 'bx-info-circle',
  success: 'bx-check-circle',
  warning: 'bx-error',
  danger: 'bx-error-circle',
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  /** Ícono de Boxicons; por defecto uno según el tono */
  icon?: string;
  /** Muestra una X para cerrarlo */
  onDismiss?: () => void;
  className?: string;
  children?: ReactNode;
}

/** Aviso en línea que se queda a la vista (a diferencia de un toast) */
export const Alert = ({ tone = 'info', title, icon, onDismiss, className, children }: AlertProps) => (
  <div
    className={cx(styles.alert, styles[tone], className)}
    role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
  >
    <i className={cx('bx', icon ?? DEFAULT_ICONS[tone], styles.icon)} aria-hidden="true" />
    <div className={styles.body}>
      {title && <p className={styles.title}>{title}</p>}
      {children && <div className={styles.text}>{children}</div>}
    </div>
    {onDismiss && (
      <IconButton icon="bx-x" label="Cerrar aviso" size="sm" onClick={onDismiss} className={styles.dismiss} />
    )}
  </div>
);