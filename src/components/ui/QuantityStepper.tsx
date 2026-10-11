// src/components/ui/QuantityStepper.tsx

import { cx } from '../../lib/cx';
import styles from './QuantityStepper.module.css';

interface QuantityStepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Nombre del ítem para lectores de pantalla, por ejemplo "Helado de fresa" */
  itemLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** − 2 + para cambiar cantidades */
export const QuantityStepper = ({
  value,
  onDecrement,
  onIncrement,
  itemLabel,
  size = 'md',
  className,
}: QuantityStepperProps) => (
  <div className={cx(styles.stepper, styles[size], className)} role="group" aria-label={`Cantidad de ${itemLabel}`}>
    <button type="button" className={styles.button} onClick={onDecrement} aria-label={`Quitar uno de ${itemLabel}`}>
      <i className="bx bx-minus" aria-hidden="true" />
    </button>
    <span className={styles.value} aria-live="polite">
      {value}
    </span>
    <button type="button" className={styles.button} onClick={onIncrement} aria-label={`Agregar uno de ${itemLabel}`}>
      <i className="bx bx-plus" aria-hidden="true" />
    </button>
  </div>
);