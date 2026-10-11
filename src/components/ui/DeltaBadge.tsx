// src/components/ui/DeltaBadge.tsx

import { cx } from '../../lib/cx';
import styles from './DeltaBadge.module.css';

interface DeltaBadgeProps {
  /** Variación relativa: 0.12 = +12 %. null = no se puede comparar (antes era 0) */
  ratio: number | null;
  /** Qué es bueno: que suba (ventas), que baje (faltantes) o ninguno (solo informa) */
  goodWhen?: 'up' | 'down' | 'none';
  /** Contra qué se compara, por ejemplo "vs ayer" */
  label?: string;
  /** Texto cuando no se puede comparar */
  emptyText?: string;
  className?: string;
}

const percentFormat = new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 1 });

/** Cuánto subió o bajó algo frente a otro período: flecha + porcentaje (nunca solo color) */
export const DeltaBadge = ({
  ratio,
  goodWhen = 'up',
  label,
  emptyText = 'Sin datos para comparar',
  className,
}: DeltaBadgeProps) => {
  if (ratio === null) {
    return (
      <span className={cx(styles.wrap, className)}>
        <span className={cx(styles.delta, styles.neutral)}>
          <i className="bx bx-minus" aria-hidden="true" />
          {emptyText}
        </span>
      </span>
    );
  }

  const flat = Math.abs(ratio) < 0.0005;
  const up = ratio > 0;
  const tone = flat || goodWhen === 'none' ? 'neutral' : up === (goodWhen === 'up') ? 'good' : 'bad';
  const icon = flat ? 'bx-minus' : up ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt';
  const sign = flat ? '' : up ? '+' : '−';
  const spoken = flat ? 'Sin cambio' : up ? 'Subió' : 'Bajó';

  return (
    <span className={cx(styles.wrap, className)}>
      <span className={cx(styles.delta, styles[tone])}>
        <i className={cx('bx', icon)} aria-hidden="true" />
        <span className="sr-only">{spoken} </span>
        {sign}
        {percentFormat.format(Math.abs(ratio))}
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
};