// src/components/ui/ChipGroup.tsx

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '../../lib/cx';
import styles from './ChipGroup.module.css';

export interface ChipOption<V extends string> {
  value: V;
  label: string;
}

interface ChipGroupProps<V extends string> {
  options: ChipOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Para lectores de pantalla, por ejemplo "Categorías" */
  ariaLabel: string;
  className?: string;
}

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Fila de "pastillas" con scroll horizontal; se elige una (categorías, filtros rápidos) */
export const ChipGroup = <V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: ChipGroupProps<V>) => {
  const groupRef = useRef<HTMLDivElement>(null);

  const focusChip = (index: number) => {
    const chip = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index];
    chip?.focus();
    chip?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  /* Flechas: cambian de opción como un grupo de radios */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const nextIndex = (index + step + options.length) % options.length;
    onChange(options[nextIndex].value);
    focusChip(nextIndex);
  };

  return (
    <div ref={groupRef} role="radiogroup" aria-label={ariaLabel} className={cx(styles.group, className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.chip, selected && styles.selected)}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};