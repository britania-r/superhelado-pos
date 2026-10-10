// src/components/ui/Textarea.tsx

import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import { useFieldContext } from './Field';
import styles from './Textarea.module.css';

interface TextareaProps extends ComponentProps<'textarea'> {
  /** Fuerza el estado de error (si está dentro de <Field>, se toma de ahí) */
  invalid?: boolean;
}

/* Igual que Input: funciona con {...register('campo')} de react-hook-form */
export const Textarea = ({
  invalid,
  id,
  rows = 3,
  className,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextareaProps) => {
  const field = useFieldContext();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const describedBy = [ariaDescribedBy, field?.describedBy].filter(Boolean).join(' ') || undefined;

  return (
    <textarea
      {...rest}
      id={id ?? field?.id}
      rows={rows}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy}
      className={cx(styles.textarea, className)}
    />
  );
};