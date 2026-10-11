// src/components/charts/Heatmap.tsx

import { useState, type KeyboardEvent } from 'react';
import type { TooltipRow } from './ChartTooltip';
import { ChartTooltip } from './ChartTooltip';
import { useElementWidth } from './useElementWidth';
import styles from './Heatmap.module.css';

export interface HeatmapCell {
  value: number;
  title: string;
  rows: TooltipRow[];
}

export interface HeatmapRow {
  key: string | number;
  label: string;
  cells: HeatmapCell[];
}

interface HeatmapProps {
  columns: string[];
  rows: HeatmapRow[];
  /** Valor para el cuadro más oscuro (por defecto, el máximo) */
  max?: number;
  /** Texto de la escala, por ejemplo "Promedio de ventas por hora" */
  legendLabel: string;
  ariaLabel: string;
}

const STEPS = 6;

/** 0 = sin ventas (gris); el resto, 6 tonos de un mismo azul */
const stepOf = (value: number, max: number) => (value <= 0 || max <= 0 ? 0 : Math.max(1, Math.ceil((value / max) * STEPS)));

/** Mapa de calor: filas × columnas, más oscuro = más */
export const Heatmap = ({ columns, rows, max, legendLabel, ariaLabel }: HeatmapProps) => {
  const [frameRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);
  const top = max ?? Math.max(0, ...rows.flatMap((row) => row.cells.map((cell) => cell.value)));

  /* En pantallas angostas se muestra una hora sí y otra no */
  const labelEvery = width > 0 && width / Math.max(1, columns.length) < 34 ? 2 : 1;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? { row: 0, col: 0 };
    const moves: Record<string, { row: number; col: number }> = {
      ArrowLeft: { row: current.row, col: current.col - 1 },
      ArrowRight: { row: current.row, col: current.col + 1 },
      ArrowUp: { row: current.row - 1, col: current.col },
      ArrowDown: { row: current.row + 1, col: current.col },
      Home: { row: current.row, col: 0 },
      End: { row: current.row, col: columns.length - 1 },
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    setActive({
      row: Math.max(0, Math.min(rows.length - 1, next.row)),
      col: Math.max(0, Math.min(columns.length - 1, next.col)),
    });
  };

  const activeCell = active ? rows[active.row]?.cells[active.col] : null;
  const gridTemplate = `var(--heat-label) repeat(${columns.length}, minmax(0, 1fr))`;

  /* Centro del cuadro activo, para ubicar el tooltip */
  const tooltipPosition = () => {
    if (!active || width === 0) return { x: 0, y: 0 };
    const labelWidth = width < 480 ? 40 : 48;
    const cellWidth = (width - labelWidth) / columns.length;
    const rowHeight = width < 480 ? 26 : 30;
    return { x: labelWidth + cellWidth * (active.col + 0.5), y: rowHeight * (active.row + 0.5) };
  };

  return (
    <div className={styles.wrap}>
      <div
        ref={frameRef}
        className={styles.frame}
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        onFocus={() => setActive((value) => value ?? { row: 0, col: 0 })}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <div className={styles.grid} style={{ gridTemplateColumns: gridTemplate }} aria-hidden="true">
          {rows.map((row, rowIndex) => (
            <div key={row.key} className={styles.row}>
              <span className={styles.rowLabel}>{row.label}</span>
              {row.cells.map((cell, colIndex) => {
                const isActive = active?.row === rowIndex && active.col === colIndex;
                return (
                  <span
                    key={colIndex}
                    className={styles.cell}
                    data-step={stepOf(cell.value, top)}
                    data-active={isActive || undefined}
                    onPointerEnter={() => setActive({ row: rowIndex, col: colIndex })}
                    onPointerDown={() => setActive({ row: rowIndex, col: colIndex })}
                  />
                );
              })}
            </div>
          ))}

          <div className={styles.row}>
            <span />
            {columns.map((column, index) => (
              <span key={column} className={styles.colLabel}>
                {index % labelEvery === 0 ? column : ''}
              </span>
            ))}
          </div>
        </div>

        {activeCell && (
          <ChartTooltip
            x={tooltipPosition().x}
            y={tooltipPosition().y}
            containerWidth={width}
            title={activeCell.title}
            rows={activeCell.rows}
          />
        )}
      </div>

      {/* Escala: de menos a más */}
      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendLabel}>{legendLabel}</span>
        <span className={styles.legendScale}>
          <span className={styles.legendText}>Sin ventas</span>
          <span className={styles.swatch} data-step={0} />
          <span className={styles.legendGap} />
          <span className={styles.legendText}>Menos</span>
          {Array.from({ length: STEPS }, (_, index) => (
            <span key={index} className={styles.swatch} data-step={index + 1} />
          ))}
          <span className={styles.legendText}>Más</span>
        </span>
      </div>
    </div>
  );
};