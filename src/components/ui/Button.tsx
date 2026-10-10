// src/components/ui/Button.tsx

import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un spinner y bloquea el botón */
  loading?: boolean;
  /** Clase de Boxicons, por ejemplo 'bx-plus' */
  icon?: string;
  iconRight?: string;
  fullWidth?: boolean;
  /** En celular muestra solo el ícono (el texto queda para lectores de pantalla) */
  iconOnlyOnMobile?: boolean;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  iconOnlyOnMobile = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cx(
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      iconOnlyOnMobile && styles.iconOnlyOnMobile,
      className
    )}
    {...rest}
  >
    {loading ? (
      <Spinner size="sm" label="" />
    ) : (
      icon && <i className={cx('bx', icon, styles.icon)} aria-hidden="true" />
    )}
    {children && <span className={styles.label}>{children}</span>}
    {!loading && iconRight && <i className={cx('bx', iconRight, styles.icon)} aria-hidden="true" />}
  </button>
);