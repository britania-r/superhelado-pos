// src/components/ui/IconButton.tsx

import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import styles from './IconButton.module.css';

export type IconButtonVariant = 'ghost' | 'secondary' | 'danger' | 'onBrand';

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Clase de Boxicons, por ejemplo 'bx-x' */
  icon: string;
  /** Texto para lectores de pantalla (el botón solo muestra el ícono) */
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
}

export const IconButton = ({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    className={cx(styles.button, styles[variant], styles[size], className)}
    {...rest}
  >
    <i className={cx('bx', icon)} aria-hidden="true" />
  </button>
);