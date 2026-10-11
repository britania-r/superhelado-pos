// src/components/charts/ChartTooltip.tsx

import type { ReactNode } from 'react';
import styles from './Chart.module.css';

export interface TooltipRow {
  /** Color de la serie (se muestra como una rayita, no como texto) */
  color?: string;
  /** Forma de la marca: línea para gráficos de línea, cuadrado para barras */
  key?: 'line' | 'square';
  /** El número: es lo que se destaca */
  value: string;
  /** Nombre de la serie o dato extra (secundario) */
  label?: string;
}

interface ChartTooltipProps {
  /** Posición del punto dentro del contenedor del gráfico (px) */
  x: number;
  y: number;
  /** Ancho del contenedor: para abrirse hacia el lado donde hay espacio */
  containerWidth: number;
  title: ReactNode;
  rows: TooltipRow[];
}

/** Recuadro que acompaña al mouse o al foco: primero el valor, después el nombre */
export const ChartTooltip = ({ x, y, containerWidth, title, rows }: ChartTooltipProps) => {
  const openLeft = x > containerWidth / 2;
  return (
    <div
      className={styles.tooltip}
      style={{
        left: x,
        top: y,
        transform: `translate(${openLeft ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
      }}
      aria-hidden="true"
    >
      <div className={styles.tooltipTitle}>{title}</div>
      {rows.map((row, index) => (
        <div key={index} className={styles.tooltipRow}>
          {row.color && (
            <span
              className={row.key === 'square' ? styles.keySquare : styles.keyLine}
              style={{ backgroundColor: row.color }}
            />
          )}
          <span className={styles.tooltipValue}>{row.value}</span>
          {row.label && <span className={styles.tooltipLabel}>{row.label}</span>}
        </div>
      ))}
    </div>
  );
};

export interface LegendItem {
  label: string;
  color: string;
  key?: 'line' | 'square';
}

/** Leyenda: siempre que hay 2 series o más */
export const ChartLegend = ({ items }: { items: LegendItem[] }) => (
  <ul className={styles.legend}>
    {items.map((item) => (
      <li key={item.label} className={styles.legendItem}>
        <span
          className={item.key === 'square' ? styles.keySquare : styles.keyLine}
          style={{ backgroundColor: item.color }}
          aria-hidden="true"
        />
        {item.label}
      </li>
    ))}
  </ul>
);