// src/features/reports/lib/metrics.ts
// Cálculos del reporte a partir de las filas de las funciones rpt_*.
// Todo es puro (sin React) para poder probarlo y reutilizarlo.

import type {
  RptCashShift,
  RptSalesByDay,
  RptSalesByHour,
  RptSalesByPaymentMethod,
  RptSalesByProduct,
  RptSalesByStore,
} from '../../../types';
import { countWeekdays, type DateRange } from './periods';

/* ── Comparación con el período anterior ── */

export interface Change {
  current: number;
  previous: number;
  diff: number;
  /** Variación relativa (0.12 = +12 %). null si antes era 0: no se puede calcular */
  ratio: number | null;
}

export const compare = (current: number, previous: number): Change => ({
  current,
  previous,
  diff: current - previous,
  /* 0 y 0: sin cambio. Antes 0 y ahora algo: no hay porcentaje posible */
  ratio: previous > 0 ? (current - previous) / previous : current === 0 ? 0 : null,
});

const safeDivide = (a: number, b: number) => (b > 0 ? a / b : 0);

/* ── Totales del período ── */

export interface Totals {
  sales: number;
  tickets: number;
  units: number;
  days: number;
  /** Días con al menos una venta */
  activeDays: number;
  /** Ventas ÷ tickets */
  avgTicket: number;
  /** Unidades ÷ tickets */
  unitsPerTicket: number;
  /** Ventas ÷ días del período */
  dailyAverage: number;
}

export const totalsFromDays = (rows: RptSalesByDay[]): Totals => {
  const sales = rows.reduce((sum, row) => sum + row.total_sales, 0);
  const tickets = rows.reduce((sum, row) => sum + row.tickets, 0);
  const units = rows.reduce((sum, row) => sum + row.units, 0);
  return {
    sales,
    tickets,
    units,
    days: rows.length,
    activeDays: rows.filter((row) => row.tickets > 0).length,
    avgTicket: safeDivide(sales, tickets),
    unitsPerTicket: safeDivide(units, tickets),
    dailyAverage: safeDivide(sales, rows.length),
  };
};

/** Mejor y peor día (solo entre días con ventas para el peor) */
export const bestAndWorstDay = (rows: RptSalesByDay[]) => {
  const withSales = rows.filter((row) => row.tickets > 0);
  if (withSales.length === 0) return null;
  const best = withSales.reduce((top, row) => (row.total_sales > top.total_sales ? row : top));
  const worst = withSales.reduce((low, row) => (row.total_sales < low.total_sales ? row : low));
  return { best, worst };
};

/* ── Productos ── */

export type AbcClass = 'A' | 'B' | 'C';

/** A: suman el primer 80 % de las ventas · B: el siguiente 15 % · C: el último 5 % */
export const ABC_LIMITS = { A: 0.8, B: 0.95 } as const;

export interface ProductRow extends RptSalesByProduct {
  rank: number;
  /** Parte de las ventas del período (0–1) */
  share: number;
  /** Parte acumulada hasta este producto, incluido (0–1) */
  cumulative: number;
  abc: AbcClass;
  /** En qué parte de los tickets aparece (0–1) */
  ticketShare: number;
  /** Precio promedio cobrado (ventas ÷ unidades) */
  avgPrice: number;
  change: Change;
  unitsChange: Change;
}

export const buildProductRows = (
  current: RptSalesByProduct[],
  previous: RptSalesByProduct[],
  totalTickets: number
): ProductRow[] => {
  const totalSales = current.reduce((sum, row) => sum + row.total_sales, 0);
  const previousById = new Map(previous.map((row) => [row.product_id, row]));
  const sorted = [...current].sort((a, b) => b.total_sales - a.total_sales || a.product_name.localeCompare(b.product_name));

  let accumulated = 0;
  return sorted.map((row, index) => {
    const share = safeDivide(row.total_sales, totalSales);
    const before = accumulated;
    accumulated += share;
    const abc: AbcClass = before < ABC_LIMITS.A ? 'A' : before < ABC_LIMITS.B ? 'B' : 'C';
    const prev = previousById.get(row.product_id);
    return {
      ...row,
      rank: index + 1,
      share,
      cumulative: accumulated,
      abc,
      ticketShare: safeDivide(row.tickets, totalTickets),
      avgPrice: safeDivide(row.total_sales, row.units),
      change: compare(row.total_sales, prev?.total_sales ?? 0),
      unitsChange: compare(row.units, prev?.units ?? 0),
    };
  });
};

export interface ProductMove {
  product_id: string;
  product_name: string;
  image_url: string | null;
  category_name: string;
  change: Change;
  unitsChange: Change;
}

/** Productos que más subieron y más bajaron en soles (incluye los que dejaron de venderse) */
export const productMoves = (current: RptSalesByProduct[], previous: RptSalesByProduct[], limit = 5) => {
  const byId = new Map<string, ProductMove>();

  for (const row of previous) {
    byId.set(row.product_id, {
      product_id: row.product_id,
      product_name: row.product_name,
      image_url: row.image_url,
      category_name: row.category_name,
      change: compare(0, row.total_sales),
      unitsChange: compare(0, row.units),
    });
  }
  for (const row of current) {
    const prev = byId.get(row.product_id);
    byId.set(row.product_id, {
      product_id: row.product_id,
      product_name: row.product_name,
      image_url: row.image_url,
      category_name: row.category_name,
      change: compare(row.total_sales, prev?.change.previous ?? 0),
      unitsChange: compare(row.units, prev?.unitsChange.previous ?? 0),
    });
  }

  const moves = [...byId.values()];
  return {
    risers: moves.filter((move) => move.change.diff > 0.005).sort((a, b) => b.change.diff - a.change.diff).slice(0, limit),
    fallers: moves.filter((move) => move.change.diff < -0.005).sort((a, b) => a.change.diff - b.change.diff).slice(0, limit),
  };
};

/* ── Categorías ── */

export interface CategoryRow {
  key: string;
  name: string;
  sales: number;
  units: number;
  products: number;
  share: number;
  change: Change;
}

export const buildCategoryRows = (current: RptSalesByProduct[], previous: RptSalesByProduct[]): CategoryRow[] => {
  const group = (rows: RptSalesByProduct[]) => {
    const map = new Map<string, { name: string; sales: number; units: number; products: number }>();
    for (const row of rows) {
      const key = String(row.category_id ?? 'none');
      const entry = map.get(key) ?? { name: row.category_name, sales: 0, units: 0, products: 0 };
      entry.sales += row.total_sales;
      entry.units += row.units;
      entry.products += 1;
      map.set(key, entry);
    }
    return map;
  };

  const now = group(current);
  const before = group(previous);
  const total = [...now.values()].reduce((sum, entry) => sum + entry.sales, 0);

  return [...now.entries()]
    .map(([key, entry]) => ({
      key,
      name: entry.name,
      sales: entry.sales,
      units: entry.units,
      products: entry.products,
      share: safeDivide(entry.sales, total),
      change: compare(entry.sales, before.get(key)?.sales ?? 0),
    }))
    .sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name));
};

/* ── Tiendas ── */

export interface StoreRow extends RptSalesByStore {
  share: number;
  avgTicket: number;
  change: Change;
}

export const buildStoreRows = (current: RptSalesByStore[], previous: RptSalesByStore[]): StoreRow[] => {
  const total = current.reduce((sum, row) => sum + row.total_sales, 0);
  const previousById = new Map(previous.map((row) => [row.store_id, row]));
  return [...current]
    .sort((a, b) => b.total_sales - a.total_sales || a.store_name.localeCompare(b.store_name))
    .map((row) => ({
      ...row,
      share: safeDivide(row.total_sales, total),
      avgTicket: safeDivide(row.total_sales, row.tickets),
      change: compare(row.total_sales, previousById.get(row.store_id)?.total_sales ?? 0),
    }));
};

/* ── Métodos de pago ── */

export interface PaymentRow extends RptSalesByPaymentMethod {
  key: string;
  share: number;
  previousShare: number;
  avgTicket: number;
  change: Change;
  /** Color fijo del método (var(--chart-N)); no cambia con el filtro */
  color: string;
  /** Texto sobre ese color: el que mejor contrasta */
  ink: 'light' | 'dark';
}

/* Texto con más contraste sobre cada color de --chart-1 a --chart-7 */
const SLOT_INK: Array<'light' | 'dark'> = ['light', 'dark', 'dark', 'dark', 'dark', 'light', 'light'];

/**
 * El color sigue al método, no a su puesto: se asigna por el orden de `methodOrder`
 * (ids de todos los métodos, por id). Del 8.º en adelante, gris.
 */
export const paymentColor = (methodId: number | null, methodOrder: number[]) => {
  const slot = methodId === null ? -1 : methodOrder.indexOf(methodId);
  return slot >= 0 && slot < SLOT_INK.length
    ? { color: `var(--chart-${slot + 1})`, ink: SLOT_INK[slot] }
    : { color: 'var(--chart-muted)', ink: 'dark' as const };
};

export const buildPaymentRows = (
  current: RptSalesByPaymentMethod[],
  previous: RptSalesByPaymentMethod[],
  methodOrder: number[]
): PaymentRow[] => {
  const total = current.reduce((sum, row) => sum + row.total_sales, 0);
  const previousTotal = previous.reduce((sum, row) => sum + row.total_sales, 0);
  const keyOf = (row: RptSalesByPaymentMethod) => String(row.payment_method_id ?? 'none');
  const previousByKey = new Map(previous.map((row) => [keyOf(row), row]));

  return [...current]
    .sort((a, b) => b.total_sales - a.total_sales)
    .map((row) => {
      const prev = previousByKey.get(keyOf(row));
      return {
        ...row,
        key: keyOf(row),
        share: safeDivide(row.total_sales, total),
        previousShare: safeDivide(prev?.total_sales ?? 0, previousTotal),
        avgTicket: safeDivide(row.total_sales, row.tickets),
        change: compare(row.total_sales, prev?.total_sales ?? 0),
        ...paymentColor(row.payment_method_id, methodOrder),
      };
    });
};

/* ── Horas ── */

export interface HourCell {
  weekday: number;
  hour: number;
  totalSales: number;
  tickets: number;
  /** Promedio por cada vez que aparece ese día de la semana en el período */
  avgSales: number;
  avgTickets: number;
}

export interface HourMatrix {
  hours: number[];
  /** Filas de lunes (índice 0) a domingo (índice 6) */
  rows: HourCell[][];
  maxAvg: number;
  weekdayCounts: number[];
}

/** Horas con ventas, de la primera a la última (sin huecos) */
const hourSpan = (rows: RptSalesByHour[]) => {
  if (rows.length === 0) return [];
  const min = Math.min(...rows.map((row) => row.hour));
  const max = Math.max(...rows.map((row) => row.hour));
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
};

export const buildHourMatrix = (rows: RptSalesByHour[], range: DateRange): HourMatrix => {
  const hours = hourSpan(rows);
  const weekdayCounts = countWeekdays(range);
  const byKey = new Map(rows.map((row) => [`${row.weekday}-${row.hour}`, row]));

  let maxAvg = 0;
  const matrix = [1, 2, 3, 4, 5, 6, 7].map((weekday) =>
    hours.map((hour) => {
      const row = byKey.get(`${weekday}-${hour}`);
      const occurrences = weekdayCounts[weekday];
      const cell: HourCell = {
        weekday,
        hour,
        totalSales: row?.total_sales ?? 0,
        tickets: row?.tickets ?? 0,
        avgSales: safeDivide(row?.total_sales ?? 0, occurrences),
        avgTickets: safeDivide(row?.tickets ?? 0, occurrences),
      };
      maxAvg = Math.max(maxAvg, cell.avgSales);
      return cell;
    })
  );

  return { hours, rows: matrix, maxAvg, weekdayCounts };
};

export interface HourTotal {
  hour: number;
  sales: number;
  tickets: number;
}

/** Ventas por hora sumando todos los días (incluye horas intermedias en 0) */
export const hourTotals = (rows: RptSalesByHour[], hours = hourSpan(rows)): HourTotal[] =>
  hours.map((hour) => {
    const matches = rows.filter((row) => row.hour === hour);
    return {
      hour,
      sales: matches.reduce((sum, row) => sum + row.total_sales, 0),
      tickets: matches.reduce((sum, row) => sum + row.tickets, 0),
    };
  });

/** Hora con más ventas y qué parte del total representa */
export const peakHour = (rows: RptSalesByHour[]) => {
  const totals = hourTotals(rows);
  const total = totals.reduce((sum, row) => sum + row.sales, 0);
  if (total === 0) return null;
  const peak = totals.reduce((top, row) => (row.sales > top.sales ? row : top));
  return { ...peak, share: peak.sales / total };
};

/** Promedio de ventas por día de la semana (1–7), por cada vez que aparece */
export const weekdayAverages = (rows: RptSalesByHour[], range: DateRange) => {
  const counts = countWeekdays(range);
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const sales = rows.filter((row) => row.weekday === weekday).reduce((sum, row) => sum + row.total_sales, 0);
    return { weekday, sales, occurrences: counts[weekday], average: safeDivide(sales, counts[weekday]) };
  });
};

/* ── Caja ── */

export type CashState = 'open' | 'balanced' | 'short' | 'over';

/** Igual que getCashDifferenceStatus: menos de medio céntimo cuenta como cuadrada */
export const cashState = (shift: RptCashShift): CashState => {
  if (shift.closed_at === null || shift.balance_difference === null) return 'open';
  if (Math.abs(shift.balance_difference) < 0.005) return 'balanced';
  return shift.balance_difference < 0 ? 'short' : 'over';
};

/** El cierre registró ventas en 0 (o vacías) aunque ese día sí hubo ventas */
export const closedWithoutSales = (shift: RptCashShift) =>
  shift.closed_at !== null && (shift.calculated_sales ?? 0) === 0 && shift.day_sales > 0;

export interface CashSummary {
  total: number;
  open: number;
  closed: number;
  balanced: number;
  shortCount: number;
  /** Suma de faltantes (número positivo) */
  shortAmount: number;
  overCount: number;
  overAmount: number;
  /** Faltantes + sobrantes con su signo */
  net: number;
  zeroOpening: number;
  closedWithoutSales: number;
}

export const summarizeCash = (shifts: RptCashShift[]): CashSummary => {
  const summary: CashSummary = {
    total: shifts.length,
    open: 0,
    closed: 0,
    balanced: 0,
    shortCount: 0,
    shortAmount: 0,
    overCount: 0,
    overAmount: 0,
    net: 0,
    zeroOpening: 0,
    closedWithoutSales: 0,
  };

  for (const shift of shifts) {
    const state = cashState(shift);
    const difference = shift.balance_difference ?? 0;
    if (state === 'open') summary.open += 1;
    else summary.closed += 1;
    if (state === 'balanced') summary.balanced += 1;
    if (state === 'short') {
      summary.shortCount += 1;
      summary.shortAmount += -difference;
    }
    if (state === 'over') {
      summary.overCount += 1;
      summary.overAmount += difference;
    }
    if (state !== 'open') summary.net += difference;
    if (shift.opening_balance === 0) summary.zeroOpening += 1;
    if (closedWithoutSales(shift)) summary.closedWithoutSales += 1;
  }
  return summary;
};