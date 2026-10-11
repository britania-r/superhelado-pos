// src/components/ui/StatCard.tsx

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './StatCard.module.css';

type StatTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  /** En minúsculas de oración y sin dos puntos, por ejemplo "Ventas del día" */
  label: string;
  value: ReactNode;
  /** Ícono de Boxicons */
  icon?: string;
  /** Color del ícono */
  tone?: StatTone;
  /** Debajo del valor: un dato extra o una etiqueta de estado */
  hint?: ReactNode;
  /** Resalta la tarjeta (el número principal del resumen) */
  emphasis?: boolean;
  className?: string;
}

/** Un número destacado con su etiqueta (totales, resúmenes) */
export const StatCard = ({ label, value, icon, tone = 'neutral', hint, emphasis = false, className }: StatCardProps) => (
  <div className={cx(styles.card, emphasis && styles.emphasis, className)}>
    <div className={styles.top}>
      <span className={styles.label}>{label}</span>
      {icon && (
        <span className={cx(styles.icon, styles[tone])} aria-hidden="true">
          <i className={cx('bx', icon)} />
        </span>
      )}
    </div>
    <span className={styles.value}>{value}</span>
    {hint && <div className={styles.hint}>{hint}</div>}
  </div>
);