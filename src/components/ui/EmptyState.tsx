// src/components/ui/EmptyState.tsx

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Ícono de Boxicons */
  icon?: string;
  /** Botón para resolverlo (por ejemplo "Añadir" o "Reintentar") */
  action?: ReactNode;
  /** 'danger' para errores al cargar */
  tone?: 'neutral' | 'danger';
}

/* Lista vacía o error al cargar: siempre con una salida clara */
export const EmptyState = ({
  title,
  description,
  icon = 'bx-folder-open',
  action,
  tone = 'neutral',
}: EmptyStateProps) => (
  <div className={cx(styles.empty, styles[tone])} role={tone === 'danger' ? 'alert' : undefined}>
    <span className={styles.icon} aria-hidden="true">
      <i className={cx('bx', icon)} />
    </span>
    <h2 className={styles.title}>{title}</h2>
    {description && <p className={styles.description}>{description}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);