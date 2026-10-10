// src/components/ui/SegmentedControl.tsx

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '../../lib/cx';
import styles from './SegmentedControl.module.css';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  /** Ícono de Boxicons, por ejemplo 'bx-show' */
  icon?: string;
}

interface SegmentedControlProps<V extends string> {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Para lectores de pantalla, por ejemplo "Estado en el punto de venta" */
  ariaLabel: string;
  /** Ocupa todo el ancho y reparte las opciones */
  fullWidth?: boolean;
  className?: string;
}

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Botones pegados para elegir una opción entre pocas (Todos · Visibles · Ocultos) */
export const SegmentedControl = <V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
  className,
}: SegmentedControlProps<V>) => {
  const groupRef = useRef<HTMLDivElement>(null);

  /* Flechas: cambian de opción como un grupo de radios */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const nextIndex = (index + step + options.length) % options.length;
    onChange(options[nextIndex].value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx(styles.group, fullWidth && styles.fullWidth, className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.option, selected && styles.selected)}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon && <i className={cx('bx', option.icon)} aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};