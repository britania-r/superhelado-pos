// src/features/reports/lib/insights.ts
// "Lo más importante": frases cortas generadas a partir de los datos.
// Cada dato que falta (todavía cargando) simplemente omite su frase.

import type { ReportPeriod } from './periods';
import { formatDay } from './periods';
import type { RptSalesByDay, RptSalesByHour } from '../../../types';
import type { CashSummary, Change, PaymentRow, ProductMove, ProductRow, StoreRow, Totals } from './metrics';
import { bestAndWorstDay, compare, peakHour, weekdayAverages } from './metrics';
import { hourLabel, hourRangeLabel, int, money, percent, plural, signedMoney, WEEKDAYS } from './format';

export type InsightTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

/** Texto normal o una parte destacada en negrita */
export type InsightPart = string | { strong: string };

export interface Insight {
  id: string;
  icon: string;
  tone: InsightTone;
  parts: InsightPart[];
}

export interface InsightInput {
  period: ReportPeriod;
  totals?: Totals;
  previousTotals?: Totals;
  days?: RptSalesByDay[];
  hours?: RptSalesByHour[];
  products?: ProductRow[];
  moves?: { risers: ProductMove[]; fallers: ProductMove[] };
  payments?: PaymentRow[];
  stores?: StoreRow[];
  withoutSalesCount?: number;
  cash?: CashSummary;
  /** Solo para "Hoy": lo que se llevaba ayer hasta la misma hora (comparación justa) */
  todaySoFar?: { lastHour: number; previousSales: number };
}

const strong = (text: string) => ({ strong: text });

/** "ayer", "los 7 días anteriores", "1–11 sep"… */
const comparedTo = (period: ReportPeriod) => period.comparisonLabel.replace(/^vs /, '');

/** "12.3% más que ayer" / "8% menos que …" / "lo mismo que …" */
const changePhrase = (change: Change, period: ReportPeriod): InsightPart[] => {
  if (change.ratio === null) return [];
  if (Math.abs(change.ratio) < 0.005) return [': casi lo mismo que ', strong(comparedTo(period))];
  const direction = change.ratio > 0 ? 'más' : 'menos';
  return [': ', strong(`${percent(Math.abs(change.ratio))} ${direction}`), ' que ', strong(comparedTo(period))];
};

const changeTone = (change: Change): InsightTone => {
  if (change.ratio === null || Math.abs(change.ratio) < 0.005) return 'brand';
  return change.ratio > 0 ? 'success' : 'danger';
};

const changeIcon = (change: Change) => {
  if (change.ratio === null || Math.abs(change.ratio) < 0.005) return 'bx-line-chart';
  return change.ratio > 0 ? 'bx-trending-up' : 'bx-trending-down';
};

export const buildInsights = (input: InsightInput): Insight[] => {
  const { period, totals, previousTotals } = input;
  const insights: Insight[] = [];

  /* ── Ventas totales ── */
  if (totals) {
    if (totals.tickets === 0) {
      insights.push({
        id: 'no-sales',
        icon: 'bx-info-circle',
        tone: 'neutral',
        parts: ['No hubo ventas en este período.'],
      });
      return insights;
    }

    const salesChange = compare(totals.sales, previousTotals?.sales ?? 0);

    /* Hoy aún no termina: se compara con ayer hasta la misma hora, no con el día completo */
    if (input.todaySoFar) {
      const soFar = compare(totals.sales, input.todaySoFar.previousSales);
      insights.push({
        id: 'sales-today',
        icon: changeIcon(soFar),
        tone: changeTone(soFar),
        parts: [
          'Hasta ahora vendiste ',
          strong(money(totals.sales)),
          ' en ',
          strong(plural(totals.tickets, 'venta')),
          '. Ayer, hasta las ',
          strong(hourLabel(input.todaySoFar.lastHour).replace(/^(\d+)/, '$1:59')),
          ', llevabas ',
          strong(money(input.todaySoFar.previousSales)),
          soFar.ratio === null
            ? '.'
            : Math.abs(soFar.ratio) < 0.005
              ? ': vas igual.'
              : `: vas ${percent(Math.abs(soFar.ratio))} ${soFar.ratio > 0 ? 'arriba' : 'abajo'}.`,
        ],
      });
    } else {
      insights.push({
        id: 'sales',
        icon: changeIcon(salesChange),
        tone: changeTone(salesChange),
        parts: [
          'Vendiste ',
          strong(money(totals.sales)),
          ' en ',
          strong(plural(totals.tickets, 'venta')),
          ...changePhrase(salesChange, period),
          previousTotals && previousTotals.sales === 0 ? ' (en el período anterior no hubo ventas para comparar).' : '.',
        ],
      });
    }

    const ticketParts: InsightPart[] = ['En promedio, cada venta fue de ', strong(money(totals.avgTicket))];
    if (previousTotals && previousTotals.tickets > 0) {
      const diff = totals.avgTicket - previousTotals.avgTicket;
      /* Menos de 1 % de cambio no es una tendencia: se dice "casi igual" */
      const meaningful = Math.abs(diff) >= previousTotals.avgTicket * 0.01;
      ticketParts.push(
        meaningful
          ? ` (${money(Math.abs(diff))} ${diff > 0 ? 'más' : 'menos'} que antes: tus clientes gastan ${diff > 0 ? 'más' : 'menos'} por compra).`
          : `, casi igual que antes (${money(previousTotals.avgTicket)}).`
      );
    } else {
      ticketParts.push('.');
    }
    insights.push({ id: 'avg-ticket', icon: 'bx-receipt', tone: 'brand', parts: ticketParts });
  }

  /* ── Mejor día ── */
  if (input.days && period.days > 1) {
    const extremes = bestAndWorstDay(input.days);
    if (extremes) {
      insights.push({
        id: 'best-day',
        icon: 'bx-calendar-star',
        tone: 'brand',
        parts: [
          'Tu mejor día fue el ',
          strong(formatDay(extremes.best.day, 'long')),
          ' con ',
          strong(money(extremes.best.total_sales)),
          '.',
        ],
      });
    }
  }

  /* ── Horas y días de la semana ── */
  if (input.hours && input.hours.length > 0) {
    const peak = peakHour(input.hours);
    if (peak) {
      insights.push({
        id: 'peak-hour',
        icon: 'bx-time-five',
        tone: 'brand',
        parts: [
          'La hora más fuerte es de ',
          strong(hourRangeLabel(peak.hour)),
          ': ahí se hace el ',
          strong(percent(peak.share)),
          ' de las ventas.',
        ],
      });
    }

    if (period.days >= 7) {
      const averages = weekdayAverages(input.hours, period.current).filter((day) => day.occurrences > 0);
      const best = averages.reduce((top, day) => (day.average > top.average ? day : top), averages[0]);
      if (best && best.average > 0) {
        insights.push({
          id: 'best-weekday',
          icon: 'bx-calendar-week',
          tone: 'brand',
          parts: [
            'El mejor día de la semana es el ',
            strong(WEEKDAYS[best.weekday].toLowerCase()),
            ': en promedio vendes ',
            strong(money(best.average)),
            ' ese día.',
          ],
        });
      }
    }
  }

  /* ── Productos ── */
  if (input.products && input.products.length > 0) {
    const top = input.products[0];
    insights.push({
      id: 'top-product',
      icon: 'bx-crown',
      tone: 'brand',
      parts: [
        'El producto estrella es ',
        strong(top.product_name),
        ': ',
        strong(money(top.total_sales)),
        ` (${percent(top.share)} de las ventas, ${plural(top.units, 'unidad', 'unidades')}).`,
      ],
    });

    const classA = input.products.filter((row) => row.abc === 'A').length;
    if (input.products.length >= 5) {
      insights.push({
        id: 'pareto',
        icon: 'bx-pie-chart-alt-2',
        tone: 'brand',
        parts: [
          strong(`${int(classA)} de ${plural(input.products.length, 'producto')}`),
          ' vendidos generan el ',
          strong('80%'),
          ' de tus ventas: son tus productos clase A, los que nunca deben faltar.',
        ],
      });
    }
  }

  if (input.moves && !input.todaySoFar) {
    const riser = input.moves.risers[0];
    const faller = input.moves.fallers[0];
    if (riser) {
      insights.push({
        id: 'riser',
        icon: 'bx-up-arrow-circle',
        tone: 'success',
        parts: [strong(riser.product_name), ' es el que más creció: ', strong(signedMoney(riser.change.diff)), ` frente a ${comparedTo(period)}.`],
      });
    }
    if (faller) {
      insights.push({
        id: 'faller',
        icon: 'bx-down-arrow-circle',
        tone: 'danger',
        parts: [strong(faller.product_name), ' es el que más cayó: ', strong(signedMoney(faller.change.diff)), ` frente a ${comparedTo(period)}.`],
      });
    }
  }

  /* ── Pagos y tiendas ── */
  if (input.payments && input.payments.length > 0) {
    const top = input.payments[0];
    insights.push({
      id: 'payment',
      icon: 'bx-wallet',
      tone: 'brand',
      parts: ['El ', strong(percent(top.share)), ' de lo vendido se cobró con ', strong(top.payment_method_name), '.'],
    });
  }

  if (input.stores && input.stores.filter((row) => row.tickets > 0).length >= 2) {
    const top = input.stores[0];
    insights.push({
      id: 'store',
      icon: 'bx-store-alt',
      tone: 'brand',
      parts: [strong(top.store_name), ' aporta el ', strong(percent(top.share)), ' de las ventas.'],
    });
  }

  /* ── Alertas ── */
  if (input.withoutSalesCount && input.withoutSalesCount > 0) {
    insights.push({
      id: 'without-sales',
      icon: 'bx-package',
      tone: 'warning',
      parts: [
        strong(plural(input.withoutSalesCount, 'producto activo', 'productos activos')),
        input.withoutSalesCount === 1 ? ' no se vendió' : ' no se vendieron',
        ' ni una vez. Revisa si conviene promocionarlos o desactivarlos.',
      ],
    });
  }

  if (input.cash && input.cash.closed > 0) {
    const cash = input.cash;
    if (cash.shortCount > 0) {
      insights.push({
        id: 'cash-short',
        icon: 'bx-error',
        tone: 'danger',
        parts: [
          strong(plural(cash.shortCount, 'caja')),
          cash.shortCount === 1 ? ' cerró con faltante: ' : ' cerraron con faltante: ',
          strong(money(cash.shortAmount)),
          ' en total.',
        ],
      });
    } else if (cash.overCount === 0) {
      insights.push({
        id: 'cash-ok',
        icon: 'bx-check-circle',
        tone: 'success',
        parts: ['Todas las cajas cerradas ', strong('cuadraron'), '.'],
      });
    }
    if (cash.closedWithoutSales > 0) {
      insights.push({
        id: 'cash-zero',
        icon: 'bx-error-alt',
        tone: 'warning',
        parts: [
          strong(plural(cash.closedWithoutSales, 'caja')),
          cash.closedWithoutSales === 1 ? ' se cerró' : ' se cerraron',
          ' con ventas en S/ 0 aunque ese día sí hubo ventas: su diferencia no es confiable.',
        ],
      });
    }
  }

  return insights;
};