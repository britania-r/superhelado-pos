// src/components/charts/TrendChart.tsx

import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useElementWidth } from './useElementWidth';
import { niceScale, pickLabelIndexes } from './scale';
import { ChartLegend, ChartTooltip } from './ChartTooltip';
import styles from './Chart.module.css';

export interface TrendSeries {
  name: string;
  /** Un valor por posición del eje X; null = sin dato (corta la línea) */
  values: Array<number | null>;
  /** Color de la línea (var(--chart-1), var(--chart-muted)…) */
  color: string;
  /** Rellena suavemente el área bajo la línea (solo la serie principal) */
  area?: boolean;
  /** Etiqueta propia de cada punto en el tooltip, por ejemplo la fecha del período anterior */
  pointLabels?: string[];
}

interface TrendChartProps {
  /** Etiquetas cortas del eje X (una por posición) */
  labels: string[];
  /** Título del tooltip en cada posición */
  titles: string[];
  /** La primera serie es la principal; las demás, de contexto */
  series: TrendSeries[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  /** Eje sin decimales (conteos) */
  integer?: boolean;
  /** Alto de la zona de dibujo, sin contar las etiquetas del eje X */
  height?: number;
  /** Descripción para lectores de pantalla */
  ariaLabel: string;
}

const MARGIN = { top: 10, right: 14, bottom: 26 };

/** Línea en el tiempo: período actual (color) vs. anterior (gris) en un solo eje */
export const TrendChart = ({
  labels,
  titles,
  series,
  formatValue,
  formatTick,
  integer = false,
  height = 220,
  ariaLabel,
}: TrendChartProps) => {
  const [frameRef, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const count = labels.length;
  const allValues = series.flatMap((item) => item.values.filter((value): value is number => value !== null));
  const scale = niceScale(Math.max(0, ...allValues), height < 180 ? 3 : 4, integer);

  /* Margen izquierdo según el texto más largo del eje Y */
  const left = Math.max(...scale.ticks.map((tick) => formatTick(tick).length)) * 6.4 + 12;
  const plotWidth = Math.max(0, width - left - MARGIN.right);
  const totalHeight = height + MARGIN.top + MARGIN.bottom;

  const x = (index: number) => (count <= 1 ? left + plotWidth / 2 : left + (index * plotWidth) / (count - 1));
  const y = (value: number) => MARGIN.top + height - (value / scale.max) * height;

  /* Trazo con cortes donde no hay dato */
  const linePath = (values: Array<number | null>) => {
    let path = '';
    let drawing = false;
    values.forEach((value, index) => {
      if (value === null) {
        drawing = false;
        return;
      }
      path += `${drawing ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`;
      drawing = true;
    });
    return path;
  };

  const areaPath = (values: Array<number | null>) => {
    const points = values.map((value, index) => ({ value, index })).filter((point) => point.value !== null);
    if (points.length < 2) return '';
    const baseline = y(0).toFixed(1);
    return (
      `M${x(points[0].index).toFixed(1)},${baseline}` +
      points.map((point) => `L${x(point.index).toFixed(1)},${y(point.value as number).toFixed(1)}`).join('') +
      `L${x(points[points.length - 1].index).toFixed(1)},${baseline}Z`
    );
  };

  const indexFromPointer = (event: PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const relative = event.clientX - box.left;
    if (count <= 1) return 0;
    return Math.max(0, Math.min(count - 1, Math.round((relative / box.width) * (count - 1))));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? count - 1;
    const moves: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(Math.max(0, Math.min(count - 1, moves[event.key])));
  };

  const main = series[0];
  const lastIndex = main ? main.values.reduce<number>((last, value, index) => (value !== null ? index : last), -1) : -1;
  const labelIndexes = pickLabelIndexes(count, plotWidth, 64);

  return (
    <div>
      {series.length > 1 && <ChartLegend items={series.map((item) => ({ label: item.name, color: item.color }))} />}

      <div
        ref={frameRef}
        className={`${styles.frame} ${styles.focusable}`}
        style={{ height: totalHeight }}
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        onFocus={() => setActive((value) => value ?? lastIndex)}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg className={styles.svg} width={width} height={totalHeight} aria-hidden="true">
            {/* Líneas guía y eje Y */}
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

            {/* Eje X */}
            {labelIndexes.map((index) => (
              <text
                key={index}
                className={styles.axisText}
                x={x(index)}
                y={MARGIN.top + height + 18}
                textAnchor={count > 1 && index === 0 ? 'start' : count > 1 && index === count - 1 ? 'end' : 'middle'}
              >
                {labels[index]}
              </text>
            ))}

            {/* Series de contexto primero, la principal encima */}
            {[...series].reverse().map((item) => (
              <g key={item.name}>
                {item.area && <path d={areaPath(item.values)} fill="var(--chart-wash)" />}
                <path
                  d={linePath(item.values)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            ))}

            {/* Punto final de la serie principal (o todos si hay uno solo) */}
            {main && lastIndex >= 0 && active === null && (
              <circle
                cx={x(lastIndex)}
                cy={y(main.values[lastIndex] as number)}
                r={4}
                fill={main.color}
                stroke="var(--bg-surface)"
                strokeWidth={2}
              />
            )}

            {/* Cruz que sigue al mouse */}
            {active !== null && (
              <g>
                <line
                  className={styles.crosshair}
                  x1={Math.round(x(active)) + 0.5}
                  x2={Math.round(x(active)) + 0.5}
                  y1={MARGIN.top}
                  y2={MARGIN.top + height}
                />
                {series.map((item) => {
                  const value = item.values[active];
                  return value === null || value === undefined ? null : (
                    <circle
                      key={item.name}
                      cx={x(active)}
                      cy={y(value)}
                      r={4}
                      fill={item.color}
                      stroke="var(--bg-surface)"
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
            )}

            {/* Zona de mouse: todo el ancho, se acerca a la posición más cercana */}
            <rect
              x={left}
              y={0}
              width={plotWidth}
              height={MARGIN.top + height}
              fill="transparent"
              onPointerMove={(event) => setActive(indexFromPointer(event))}
              onPointerDown={(event) => setActive(indexFromPointer(event))}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        )}

        {active !== null && width > 0 && (
          <ChartTooltip
            x={x(active)}
            y={MARGIN.top + height / 2}
            containerWidth={width}
            title={titles[active]}
            rows={series
              .filter((item) => item.values[active] !== null && item.values[active] !== undefined)
              .map((item) => ({
                color: item.color,
                value: formatValue(item.values[active] as number),
                label: item.pointLabels?.[active] ?? item.name,
              }))}
          />
        )}
      </div>
    </div>
  );
};