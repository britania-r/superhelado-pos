// src/features/reports/sections/TrendSection.tsx
// ¿Voy subiendo o bajando? Día por día (o hora por hora si es un solo día),
// contra el período anterior.

import { useMemo, useState } from 'react';
import { TrendChart } from '../../../components/charts/TrendChart';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { DeltaBadge } from '../../../components/ui/DeltaBadge';
import { ReportSection, SectionEmpty, SectionStatus, ViewToggle, type ViewMode } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import { currentLimaHour, formatDay, todayInLima, type ReportPeriod } from '../lib/periods';
import { compare } from '../lib/metrics';
import { hourAxisLabel, hourRangeLabel, int, money, moneyCompact } from '../lib/format';
import type { RptSalesByHour } from '../../../types';
import styles from './sections.module.css';

type Metric = 'sales' | 'tickets' | 'avgTicket';

const METRIC_OPTIONS = [
  { value: 'sales' as const, label: 'Ventas' },
  { value: 'tickets' as const, label: 'N.º de ventas' },
  { value: 'avgTicket' as const, label: 'Ticket promedio' },
];

/** Un punto del gráfico (y una fila de la tabla) */
interface Point {
  key: string;
  label: string;
  title: string;
  sales: number | null;
  tickets: number | null;
  previousLabel?: string;
  previousSales: number | null;
  previousTickets: number | null;
}

const metricValue = (metric: Metric, sales: number | null, tickets: number | null) => {
  if (sales === null || tickets === null) return null;
  if (metric === 'sales') return sales;
  if (metric === 'tickets') return tickets;
  return tickets > 0 ? sales / tickets : null;
};

const sumByHour = (rows: RptSalesByHour[] | undefined, hour: number) => {
  const matches = (rows ?? []).filter((row) => row.hour === hour);
  return {
    sales: matches.reduce((sum, row) => sum + row.total_sales, 0),
    tickets: matches.reduce((sum, row) => sum + row.tickets, 0),
  };
};

interface TrendSectionProps {
  period: ReportPeriod;
  data: ReportData;
}

export const TrendSection = ({ period, data }: TrendSectionProps) => {
  const [metric, setMetric] = useState<Metric>('sales');
  const [view, setView] = useState<ViewMode>('chart');
  const byHour = period.isSingleDay;

  const queries = byHour ? [data.hours, data.previousHours] : [data.days, data.previousDays];
  const busy = queries.some((query) => query.isPlaceholderData);

  const points = useMemo<Point[]>(() => {
    if (byHour) {
      const current = data.hours.data;
      const previous = data.previousHours.data;
      if (!current) return [];
      const allHours = [...current, ...(previous ?? [])].map((row) => row.hour);
      if (allHours.length === 0) return [];
      const first = Math.min(...allHours);
      const last = Math.max(...allHours);
      /* Hoy: las horas que aún no llegan no se dibujan (no son "cero ventas") */
      const nowHour = period.includesToday ? Math.max(currentLimaHour(), ...current.map((row) => row.hour)) : 24;
      return Array.from({ length: last - first + 1 }, (_, index) => {
        const hour = first + index;
        const now = sumByHour(current, hour);
        const before = sumByHour(previous, hour);
        const future = hour > nowHour;
        return {
          key: String(hour),
          label: hourAxisLabel(hour),
          title: hourRangeLabel(hour),
          sales: future ? null : now.sales,
          tickets: future ? null : now.tickets,
          previousSales: previous ? before.sales : null,
          previousTickets: previous ? before.tickets : null,
        };
      });
    }

    const current = data.days.data;
    const previous = data.previousDays.data;
    if (!current) return [];
    const longLabels = current.length <= 14;
    const today = todayInLima();
    return current.map((row, index) => {
      const before = previous?.[index];
      return {
        key: row.day,
        label: formatDay(row.day, longLabels ? 'weekdayShort' : 'short'),
        title: row.day === today ? `${formatDay(row.day, 'long')} (hoy, en curso)` : formatDay(row.day, 'long'),
        sales: row.total_sales,
        tickets: row.tickets,
        previousLabel: before ? formatDay(before.day, 'weekdayShort') : undefined,
        previousSales: before ? before.total_sales : null,
        previousTickets: before ? before.tickets : null,
      };
    });
  }, [byHour, data.hours.data, data.previousHours.data, data.days.data, data.previousDays.data, period.includesToday]);

  const isMoney = metric !== 'tickets';
  const format = isMoney ? money : int;
  const metricName = METRIC_OPTIONS.find((option) => option.value === metric)!.label;
  const hasSales = points.some((point) => (point.tickets ?? 0) > 0 || (point.previousTickets ?? 0) > 0);

  const previousName = byHour ? 'Día anterior' : 'Período anterior';
  const columns: DataTableColumn<Point>[] = [
    { key: 'when', header: byHour ? 'Hora' : 'Día', render: (point) => point.title, strong: true, mobile: 'title' },
    { key: 'sales', header: 'Ventas', align: 'right', render: (point) => (point.sales === null ? '—' : money(point.sales)) },
    { key: 'tickets', header: 'N.º de ventas', align: 'right', render: (point) => (point.tickets === null ? '—' : int(point.tickets)) },
    {
      key: 'avg',
      header: 'Ticket promedio',
      align: 'right',
      render: (point) => {
        const value = metricValue('avgTicket', point.sales, point.tickets);
        return value === null ? '—' : money(value);
      },
    },
    {
      key: 'previous',
      header: byHour ? 'Ventas día anterior' : 'Ventas período anterior',
      align: 'right',
      muted: true,
      render: (point) =>
        point.previousSales === null ? '—' : `${money(point.previousSales)}${point.previousLabel ? ` (${point.previousLabel})` : ''}`,
    },
    {
      key: 'change',
      header: 'Variación',
      align: 'right',
      render: (point) =>
        point.sales === null || point.previousSales === null ? '—' : <DeltaBadge ratio={compare(point.sales, point.previousSales).ratio} emptyText="Sin dato" />,
    },
  ];

  return (
    <ReportSection
      id="tendencia"
      icon="bx-line-chart"
      title="Tendencia"
      question={byHour ? '¿Cómo fueron las ventas hora por hora?' : '¿Voy subiendo o bajando día a día?'}
      busy={busy}
      actions={
        <>
          <SegmentedControl options={METRIC_OPTIONS} value={metric} onChange={setMetric} ariaLabel="Qué mostrar" />
          <ViewToggle value={view} onChange={setView} />
        </>
      }
      howTo={
        <>
          <p>
            La <strong>línea azul</strong> es el período elegido y la <strong>gris</strong> el{' '}
            {byHour ? 'día anterior, a la misma hora' : 'período anterior, día por día (1.º con 1.º, 2.º con 2.º…)'}.
            Si la azul va por encima de la gris, estás vendiendo más que antes.
          </p>
          <ul>
            <li>
              <strong>Ventas:</strong> soles vendidos. <strong>N.º de ventas:</strong> cuántos cobros hubo.{' '}
              <strong>Ticket promedio:</strong> cuánto gastó cada cliente.
            </li>
            <li>Pasa el mouse o toca el gráfico para ver los números exactos; con el teclado usa las flechas.</li>
            <li>Si las ventas suben pero el ticket promedio baja, entraron más clientes pero cada uno gastó menos.</li>
          </ul>
        </>
      }
    >
      <SectionStatus queries={queries} height={276}>
        {!hasSales ? (
          <SectionEmpty icon="bx-line-chart">No hay ventas en este período ni en el anterior.</SectionEmpty>
        ) : view === 'chart' ? (
          <TrendChart
            labels={points.map((point) => point.label)}
            titles={points.map((point) => point.title)}
            series={[
              {
                name: byHour ? 'Este día' : 'Este período',
                color: 'var(--chart-1)',
                area: true,
                values: points.map((point) => metricValue(metric, point.sales, point.tickets)),
              },
              {
                name: previousName,
                color: 'var(--chart-muted)',
                values: points.map((point) => metricValue(metric, point.previousSales, point.previousTickets)),
                pointLabels: points.map((point) => (point.previousLabel ? `Antes · ${point.previousLabel}` : previousName)),
              },
            ]}
            formatValue={format}
            formatTick={isMoney ? moneyCompact : int}
            integer={metric === 'tickets'}
            ariaLabel={`${metricName} ${byHour ? 'por hora' : 'por día'} de ${period.label}, comparado con ${period.comparisonLabel.replace(/^vs /, '')}. Usa las flechas para recorrer los puntos o cambia a la vista de tabla.`}
          />
        ) : (
          <div className={styles.tableScroll}>
            <DataTable columns={columns} rows={points} rowKey={(point) => point.key} caption={`${metricName} por ${byHour ? 'hora' : 'día'}`} />
          </div>
        )}
      </SectionStatus>
    </ReportSection>
  );
};