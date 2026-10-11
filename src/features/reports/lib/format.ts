// src/features/reports/lib/format.ts
// Números y horas para el reporte (español de Perú).

import { formatCurrency } from '../../../lib/formatters';

export const money = formatCurrency;

const integerFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 1 });

/** 1,234 */
export const int = (value: number) => integerFormat.format(value);

/** 1.2 (un decimal fijo) */
export const decimal = (value: number) => decimalFormat.format(value);

/** 0.1234 → "12.3%" */
export const percent = (ratio: number) => percentFormat.format(ratio);

/** Cifra corta para ejes: 950, 1.5 mil, 12 mil, 1.3 M */
export const compact = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trimZero((value / 1_000_000).toFixed(1))} M`;
  if (abs >= 1_000) return `${trimZero((value / 1_000).toFixed(abs >= 10_000 ? 0 : 1))} mil`;
  return integerFormat.format(value);
};

const trimZero = (text: string) => text.replace(/\.0$/, '');

/** Soles cortos para ejes: S/ 1.5 mil */
export const moneyCompact = (value: number) => `S/ ${compact(value)}`;

/** Variación con signo: +12.3% · −4% (signo menos real) */
export const signedPercent = (ratio: number) => {
  const text = percentFormat.format(Math.abs(ratio));
  if (Math.abs(ratio) < 0.0005) return text;
  return `${ratio > 0 ? '+' : '−'}${text}`;
};

/** Diferencia en soles con signo: +S/ 12.50 · −S/ 3.00 */
export const signedMoney = (value: number) => {
  if (Math.abs(value) < 0.005) return money(0);
  return `${value > 0 ? '+' : '−'}${money(Math.abs(value))}`;
};

/* ── Horas ── */

const period = (hour: number) => (hour < 12 ? 'a. m.' : 'p. m.');
const hour12 = (hour: number) => (hour % 12 === 0 ? 12 : hour % 12);

/** 16 → "4 p. m." */
export const hourLabel = (hour: number) => `${hour12(hour)} ${period(hour)}`;

/** 16 → "4 a 5 p. m.", 11 → "11 a. m. a 12 p. m." */
export const hourRangeLabel = (hour: number) => {
  const next = (hour + 1) % 24;
  return period(hour) === period(next)
    ? `${hour12(hour)} a ${hour12(next)} ${period(next)}`
    : `${hourLabel(hour)} a ${hourLabel(next)}`;
};

/** 16 → "16 h" (ejes) */
export const hourAxisLabel = (hour: number) => `${hour} h`;

export const WEEKDAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** "1 venta", "3 ventas" */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${int(count)} ${count === 1 ? singular : pluralForm}`;