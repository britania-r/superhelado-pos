// src/components/ui/FormActions.tsx

import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './FormActions.module.css';

interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

/* Barra de botones al pie de un formulario (Cancelar · Guardar).
   Dentro de un Modal ocupa todo el ancho y queda fija abajo al hacer scroll. */
export const FormActions = ({ children, className }: FormActionsProps) => (
  <div className={cx(styles.actions, className)}>{children}</div>
);