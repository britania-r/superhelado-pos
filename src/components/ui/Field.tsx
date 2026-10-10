// src/components/ui/Field.tsx

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Field.module.css';

/* El campo comparte con su control (Input, Select…) el id, si tiene error
   y qué textos lo describen, para que la etiqueta y los mensajes queden
   conectados sin pasar props a mano. */
interface FieldContextValue {
  id: string;
  invalid: boolean;
  describedBy?: string;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export const useFieldContext = () => useContext(FieldContext);

interface FieldProps {
  label?: string;
  /** id del control. Si no se pasa, se genera uno. */
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export const Field = ({ label, htmlFor, hint, error, required, className, children }: FieldProps) => {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <FieldContext.Provider value={{ id, invalid: !!error, describedBy: message ? messageId : undefined }}>
      <div className={cx(styles.field, className)}>
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
            {required && <span className={styles.required} aria-hidden="true">*</span>}
          </label>
        )}
        {children}
        {error ? (
          <p id={messageId} className={styles.error} role="alert">
            <i className="bx bx-error-circle" aria-hidden="true" />
            {error}
          </p>
        ) : (
          hint && <p id={messageId} className={styles.hint}>{hint}</p>
        )}
      </div>
    </FieldContext.Provider>
  );
};