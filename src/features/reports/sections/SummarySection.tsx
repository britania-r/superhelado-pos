// src/features/reports/sections/SummarySection.tsx
// ¿Cómo me fue? Los números principales y cuánto cambiaron.

import type { ReactNode } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { DeltaBadge } from '../../../components/ui/DeltaBadge';
import { ReportSection, SectionStatus } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import { formatRange, type ReportPeriod } from '../lib/periods';
import { compare, type Totals } from '../lib/metrics';
import { decimal, int, money } from '../lib/format';
import styles from './sections.module.css';

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

interface SummarySectionProps {
  period: ReportPeriod;
  data: ReportData;
  totals?: Totals;
  previousTotals?: Totals;
}

interface Kpi {
  key: string;
  label: string;
  value: string;
  current: number;
  previous?: number;
  previousText?: string;
  info: ReactNode;
  emphasis?: boolean;
}

export const SummarySection = ({ period, data, totals, previousTotals }: SummarySectionProps) => {
  const kpis: Kpi[] = totals
    ? [
        {
          key: 'sales',
          label: 'Ventas',
          value: money(totals.sales),
          current: totals.sales,
          previous: previousTotals?.sales,
          previousText: previousTotals && money(previousTotals.sales),
          emphasis: true,
          info: 'Todo lo que vendiste en el período, en soles.',
        },
        {
          key: 'tickets',
          label: 'Número de ventas',
          value: int(totals.tickets),
          current: totals.tickets,
          previous: previousTotals?.tickets,
          previousText: previousTotals && int(previousTotals.tickets),
          info: 'Cuántas veces se cobró en el punto de venta. Cada cobro es una venta (un ticket), sin importar cuántos productos lleve.',
        },
        {
          key: 'avg-ticket',
          label: 'Ticket promedio',
          value: money(totals.avgTicket),
          current: totals.avgTicket,
          previous: previousTotals?.avgTicket,
          previousText: previousTotals && money(previousTotals.avgTicket),
          info: (
            <>
              Cuánto gasta en promedio cada cliente por compra: <strong>ventas ÷ número de ventas</strong>. Por
              ejemplo, S/ 1,000 en 200 ventas = S/ 5.00. Sube cuando los clientes llevan más o productos más caros.
            </>
          ),
        },
        {
          key: 'units',
          label: 'Unidades vendidas',
          value: int(totals.units),
          current: totals.units,
          previous: previousTotals?.units,
          previousText: previousTotals && int(previousTotals.units),
          info: 'Cuántos productos salieron en total, sumando las cantidades de cada venta.',
        },
        {
          key: 'units-per-ticket',
          label: 'Productos por venta',
          value: decimal(totals.unitsPerTicket),
          current: totals.unitsPerTicket,
          previous: previousTotals?.unitsPerTicket,
          previousText: previousTotals && decimal(previousTotals.unitsPerTicket),
          info: (
            <>
              <strong>Unidades ÷ número de ventas.</strong> Si sube, los clientes llevan más cosas por compra (por
              ejemplo, un topping o una bebida extra).
            </>
          ),
        },
        ...(period.days > 1
          ? [
              {
                key: 'daily',
                label: 'Promedio por día',
                value: money(totals.dailyAverage),
                current: totals.dailyAverage,
                previous: previousTotals?.dailyAverage,
                previousText: previousTotals && money(previousTotals.dailyAverage),
                info: (
                  <>
                    <strong>Ventas ÷ {int(totals.days)} días</strong> del período (cuentan también los días sin ventas).
                    Sirve para comparar períodos de distinto largo.
                  </>
                ),
              },
            ]
          : []),
      ]
    : [];

  return (
    <ReportSection
      id="resumen"
      icon="bx-tachometer"
      title="Resumen"
      question="¿Cómo me fue en este período?"
      busy={data.days.isPlaceholderData || data.previousDays.isPlaceholderData}
      howTo={
        <>
          <p>
            Cada tarjeta compara el período elegido con el <strong>período anterior del mismo largo</strong> (
            {period.comparisonLabel.replace(/^vs /, '')}).
          </p>
          <ul>
            <li>
              <strong>Verde con flecha arriba:</strong> subió. <strong>Rojo con flecha abajo:</strong> bajó.
            </li>
            <li>El porcentaje dice cuánto cambió: +10% es una décima parte más que antes.</li>
            <li>Toca el ícono ? junto a cada nombre para ver cómo se calcula.</li>
          </ul>
        </>
      }
    >
      <SectionStatus queries={[data.days]} height={112}>
        <p className={styles.compareNote}>
          <i className="bx bx-git-compare" aria-hidden="true" />
          <span>
            Comparado con el período anterior: <strong>{lowerFirst(formatRange(period.previous))}</strong>.
          </span>
        </p>
        <div className={styles.kpis}>
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.key}
              label={kpi.label}
              emphasis={kpi.emphasis}
              value={kpi.value}
              info={kpi.info}
              hint={
                kpi.previous === undefined ? (
                  <span className={styles.muted}>Comparando…</span>
                ) : (
                  <>
                    <DeltaBadge ratio={compare(kpi.current, kpi.previous).ratio} emptyText="Antes: sin ventas" />
                    {kpi.previous > 0 && <span className={styles.muted}>Antes: {kpi.previousText}</span>}
                  </>
                )
              }
            />
          ))}
        </div>
      </SectionStatus>
    </ReportSection>
  );
};