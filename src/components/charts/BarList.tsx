// src/components/charts/BarList.tsx

import type { ReactNode } from 'react';
import styles from './BarList.module.css';

export interface BarListItem {
  key: string;
  /** Nombre (texto en tinta, nunca del color de la barra) */
  label: ReactNode;
  /** Línea gris debajo del nombre */
  sublabel?: ReactNode;
  /** Algo a la izquierda: miniatura, ícono o puesto */
  leading?: ReactNode;
  value: number;
  /** El valor ya formateado, al final de la barra */
  valueLabel: string;
  /** Dato extra a la derecha del valor (porcentaje, variación…) */
  detail?: ReactNode;
}

interface BarListProps {
  items: BarListItem[];
  /** Valor de la barra completa (por defecto, el mayor) */
  max?: number;
  /** Color de las barras (una sola serie: todas iguales) */
  color?: string;
  /** Describe la lista para lectores de pantalla */
  ariaLabel: string;
}

/** Ranking con barras horizontales: nombre arriba, barra fina abajo, valor a la derecha */
export const BarList = ({ items, max, color = 'var(--chart-1)', ariaLabel }: BarListProps) => {
  const top = max ?? Math.max(0, ...items.map((item) => item.value));

  return (
    <ol className={styles.list} aria-label={ariaLabel}>
      {items.map((item) => {
        const width = top > 0 ? Math.max(0, (item.value / top) * 100) : 0;
        return (
          <li key={item.key} className={styles.item}>
            {item.leading && <span className={styles.leading}>{item.leading}</span>}
            <div className={styles.body}>
              <div className={styles.head}>
                <span className={styles.text}>
                  <span className={styles.label}>{item.label}</span>
                  {item.sublabel && <span className={styles.sublabel}>{item.sublabel}</span>}
                </span>
                <span className={styles.values}>
                  <span className={styles.value}>{item.valueLabel}</span>
                  {item.detail && <span className={styles.detail}>{item.detail}</span>}
                </span>
              </div>
              <span className={styles.track} aria-hidden="true">
                {width > 0 && <span className={styles.bar} style={{ width: `${width}%`, backgroundColor: color }} />}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};