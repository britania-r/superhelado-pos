// src/components/charts/ColumnChart.tsx

import { useState, type KeyboardEvent } from 'react';
import { useElementWidth } from './useElementWidth';
import { niceScale, pickLabelIndexes } from './scale';
import { ChartTooltip, type TooltipRow } from './ChartTooltip';
import styles from './Chart.module.css';

export interface ColumnDatum {
  key: string | number;
  /** Etiqueta corta del eje X */
  label: string;
  value: number;
  /** Título del tooltip */
  title: string;
  /** Filas extra del tooltip (por ejemplo, tickets) */
  extra?: TooltipRow[];
}

interface ColumnChartProps {
  data: ColumnDatum[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  integer?: boolean;
  height?: number;
  color?: string;
  /** Escribe el valor sobre la columna más alta */
  labelMax?: boolean;
  ariaLabel: string;
}

const MARGIN = { top: 22, right: 6, bottom: 26 };
const MAX_BAR = 24;
const RADIUS = 4;

/* Columna con las esquinas de arriba redondeadas y la base recta */
const columnPath = (x: number, y: number, width: number, height: number) => {
  const r = Math.min(RADIUS, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
};

/** Columnas de una sola serie (por ejemplo, ventas por hora) */
export const ColumnChart = ({
  data,
  formatValue,
  formatTick,
  integer = false,
  height = 200,
  color = 'var(--chart-1)',
  labelMax = true,
  ariaLabel,
}: ColumnChartProps) => {
  const [frameRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const scale = niceScale(Math.max(0, ...data.map((item) => item.value)), 4, integer);
  const left = Math.max(...scale.ticks.map((tick) => formatTick(tick).length)) * 6.4 + 12;
  const plotWidth = Math.max(0, width - left - MARGIN.right);
  const band = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.max(4, Math.min(MAX_BAR, band - 4));
  const totalHeight = height + MARGIN.top + MARGIN.bottom;
  const y = (value: number) => MARGIN.top + height - (value / scale.max) * height;
  const center = (index: number) => left + band * index + band / 2;

  const maxIndex = data.reduce((top, item, index) => (item.value > (data[top]?.value ?? -1) ? index : top), 0);
  const labelIndexes = pickLabelIndexes(data.length, plotWidth, 36);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? maxIndex;
    const moves: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: data.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(Math.max(0, Math.min(data.length - 1, moves[event.key])));
  };

  return (
    <div
      ref={frameRef}
      className={`${styles.frame} ${styles.focusable}`}
      style={{ height: totalHeight }}
      tabIndex={0}
      role="img"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onFocus={() => setActive((value) => value ?? maxIndex)}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg className={styles.svg} width={width} height={totalHeight} aria-hidden="true" onPointerLeave={() => setActive(null)}>
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                className={tick === 0 ? styles.baseline : styles.grid}
                x1={left}
                x2={left + plotWidth}
                y1={Math.round(y(tick)) + 0.5}
                y2={Math.round(y(tick)) + 0.5}
              />
              <text className={styles.axisText} x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {data.map((item, index) => {
            const top = y(item.value);
            const barHeight = MARGIN.top + height - top;
            const isActive = active === index;
            return (
              <g key={item.key}>
                {item.value > 0 && (
                  <path
                    d={columnPath(center(index) - barWidth / 2, top, barWidth, barHeight)}
                    fill={color}
                    opacity={active !== null && !isActive ? 0.55 : 1}
                  />
                )}
                {labelMax && index === maxIndex && item.value > 0 && (
                  <text className={styles.axisText} x={center(index)} y={top - 6} textAnchor="middle" fontWeight={700}>
                    {formatTick(item.value)}
                  </text>
                )}
                {/* Zona de mouse: toda la franja de la columna */}
                <rect
                  x={left + band * index}
                  y={0}
                  width={band}
                  height={MARGIN.top + height}
                  fill="transparent"
                  onPointerEnter={() => setActive(index)}
                  onPointerDown={() => setActive(index)}
                />
              </g>
            );
          })}

          {labelIndexes.map((index) => (
            <text key={index} className={styles.axisText} x={center(index)} y={MARGIN.top + height + 18} textAnchor="middle">
              {data[index].label}
            </text>
          ))}
        </svg>
      )}

      {active !== null && width > 0 && data[active] && (
        <ChartTooltip
          x={center(active)}
          y={Math.max(MARGIN.top + 24, y(data[active].value))}
          containerWidth={width}
          title={data[active].title}
          rows={[{ color, key: 'square', value: formatValue(data[active].value) }, ...(data[active].extra ?? [])]}
        />
      )}
    </div>
  );
};