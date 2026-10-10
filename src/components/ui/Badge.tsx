// src/components/ui/Badge.tsx

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  /** Ícono de Boxicons a la izquierda, por ejemplo 'bx-shield-quarter' */
  icon?: string;
  className?: string;
  children: ReactNode;
}

/** Etiqueta corta de estado o categoría (rol, activo, sin asignar…) */
export const Badge = ({ tone = 'neutral', icon, className, children }: BadgeProps) => (
  <span className={cx(styles.badge, styles[tone], className)}>
    {icon && <i className={cx('bx', icon, styles.icon)} aria-hidden="true" />}
    {children}
  </span>
);