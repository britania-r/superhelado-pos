// src/components/charts/ShareBar.tsx

import { useState } from 'react';
import { useElementWidth } from './useElementWidth';
import { ChartTooltip } from './ChartTooltip';
import styles from './ShareBar.module.css';

export interface ShareSegment {
  key: string;
  label: string;
  value: number;
  /** Color fijo de la categoría (sigue a la categoría, no a su puesto) */
  color: string;
  /** Texto dentro del color: claro sobre colores oscuros, tinta sobre colores claros */
  ink?: 'light' | 'dark';
  /** Valor formateado para el tooltip, por ejemplo "S/ 1,234.00" */
  valueLabel: string;
}

interface ShareBarProps {
  segments: ShareSegment[];
  ariaLabel: string;
}

const percentFormat = new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 0 });
const GAP = 2;

/** Barra de 100 %: cómo se reparte un total entre pocas categorías (hasta 7) */
export const ShareBar = ({ segments, ariaLabel }: ShareBarProps) => {
  const [frameRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const visible = segments.filter((segment) => segment.value > 0);
  const usable = Math.max(0, width - GAP * Math.max(0, visible.length - 1));

  /* Dónde empieza cada tramo (para ubicar el tooltip) */
  let offset = 0;
  const layout = visible.map((segment) => {
    const segmentWidth = total > 0 ? (segment.value / total) * usable : 0;
    const start = offset;
    offset += segmentWidth + GAP;
    return { segment, start, width: segmentWidth };
  });

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      role="img"
      aria-label={ariaLabel}
      onPointerLeave={() => setActive(null)}
    >
      <div className={styles.bar} aria-hidden="true">
        {layout.map(({ segment, width: segmentWidth }, index) => {
          const share = total > 0 ? segment.value / total : 0;
          const text = percentFormat.format(share);
          /* La etiqueta va adentro solo si entra con aire a los lados */
          const fits = segmentWidth >= text.length * 7.5 + 14;
          return (
            <span
              key={segment.key}
              className={styles.segment}
              data-active={active === index || undefined}
              data-dim={(active !== null && active !== index) || undefined}
              style={{ flexGrow: segment.value, backgroundColor: segment.color }}
              onPointerEnter={() => setActive(index)}
              onPointerDown={() => setActive(index)}
            >
              {fits && <span className={segment.ink === 'dark' ? styles.inkDark : styles.inkLight}>{text}</span>}
            </span>
          );
        })}
      </div>

      {active !== null && layout[active] && width > 0 && (
        <ChartTooltip
          x={layout[active].start + layout[active].width / 2}
          y={12}
          containerWidth={width}
          title={layout[active].segment.label}
          rows={[
            {
              color: layout[active].segment.color,
              key: 'square',
              value: layout[active].segment.valueLabel,
              label: percentFormat.format(total > 0 ? layout[active].segment.value / total : 0),
            },
          ]}
        />
      )}
    </div>
  );
};