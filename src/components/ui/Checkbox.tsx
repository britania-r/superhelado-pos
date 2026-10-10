// src/components/ui/Checkbox.tsx

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Checkbox.module.css';

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'size'> {
  label?: ReactNode;
  /** Segunda línea en gris */
  description?: ReactNode;
  className?: string;
}

/** Casilla con el diseño de la app (sigue siendo un checkbox para el teclado y lectores) */
export const Checkbox = ({ label, description, className, id, disabled, ...rest }: CheckboxProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className={cx(styles.wrapper, disabled && styles.disabled, className)}>
      <input {...rest} id={inputId} type="checkbox" disabled={disabled} className={styles.input} />
      <span className={styles.box} aria-hidden="true">
        <i className="bx bx-check" />
      </span>
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && <span className={styles.description}>{description}</span>}
        </span>
      )}
    </label>
  );
};