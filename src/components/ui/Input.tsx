// src/components/ui/Input.tsx

import { useState, type ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import { useFieldContext } from './Field';
import styles from './Input.module.css';

interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  /** Ícono de Boxicons a la izquierda, por ejemplo 'bx-envelope' */
  icon?: string;
  /** Texto fijo a la izquierda, por ejemplo 'S/' en un precio */
  prefixText?: string;
  /** Muestra una "x" propia para borrar el texto (búsquedas) */
  onClear?: () => void;
  size?: 'md' | 'lg';
  /** Fuerza el estado de error (si está dentro de <Field>, se toma de ahí) */
  invalid?: boolean;
  /** Clase para el contenedor */
  className?: string;
}

/* Funciona con react-hook-form: {...register('campo')} trae el ref
   y en React 19 el ref llega como una prop más. */
export const Input = ({
  icon,
  prefixText,
  onClear,
  size = 'md',
  invalid,
  type = 'text',
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: InputProps) => {
  const field = useFieldContext();
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const showClear = !!onClear && typeof rest.value === 'string' && rest.value !== '';
  const isInvalid = invalid ?? field?.invalid ?? false;
  const describedBy = [ariaDescribedBy, field?.describedBy].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={cx(
        styles.wrapper,
        styles[size],
        icon && styles.withIcon,
        prefixText && styles.withPrefix,
        (isPassword || onClear) && styles.withToggle,
        className
      )}
    >
      {icon && <i className={cx('bx', icon, styles.icon)} aria-hidden="true" />}
      {prefixText && <span className={styles.prefix} aria-hidden="true">{prefixText}</span>}

      <input
        {...rest}
        id={id ?? field?.id}
        type={isPassword && revealed ? 'text' : type}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        className={styles.input}
      />

      {isPassword && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setRevealed((value) => !value)}
          onMouseDown={(event) => event.preventDefault()} // no quita el foco del campo
          aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={revealed}
          disabled={rest.disabled}
        >
          <i className={cx('bx', revealed ? 'bx-hide' : 'bx-show')} aria-hidden="true" />
        </button>
      )}

      {showClear && (
        <button
          type="button"
          className={styles.toggle}
          onClick={onClear}
          onMouseDown={(event) => event.preventDefault()} // no quita el foco del campo
          aria-label="Borrar texto"
          disabled={rest.disabled}
        >
          <i className="bx bx-x" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};