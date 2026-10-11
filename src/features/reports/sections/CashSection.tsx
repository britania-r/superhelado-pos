// src/features/reports/sections/CashSection.tsx
// ¿Cuadran las cajas? Faltantes, sobrantes y cierres con datos dudosos.

import { useMemo, useState } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { Pagination } from '../../../components/ui/Pagination';
import { getCashDifferenceStatus } from '../../../lib/cash';
import { ReportSection, SectionEmpty, SectionStatus } from '../components/ReportSection';
import type { ReportData } from '../useReportData';
import { formatDay, limaDay, todayInLima } from '../lib/periods';
import { cashState, closedWithoutSales, summarizeCash } from '../lib/metrics';
import { int, money, plural, signedMoney } from '../lib/format';
import type { RptCashShift } from '../../../types';
import styles from './sections.module.css';

type Filter = 'issues' | 'all';

const PAGE_SIZE = 10;

const timeFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true });

interface CashSectionProps {
  data: ReportData;
  allStores: boolean;
}

export const CashSection = ({ data, allStores }: CashSectionProps) => {
  const shifts = useMemo(() => data.cash.data ?? [], [data.cash.data]);
  const summary = useMemo(() => summarizeCash(shifts), [shifts]);
  const [filter, setFilter] = useState<Filter>('issues');
  const [page, setPage] = useState(1);

  /* "Para revisar": faltantes, sobrantes, cierres dudosos y cajas que quedaron abiertas
     de días anteriores (la de hoy abierta es normal) */
  const today = todayInLima();
  const issues = shifts.filter((shift) => {
    const state = cashState(shift);
    if (state === 'open') return limaDay(shift.opened_at) !== today;
    return state !== 'balanced' || closedWithoutSales(shift);
  });
  const visible = filter === 'issues' ? issues : shifts;
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: DataTableColumn<RptCashShift>[] = [
    {
      key: 'date',
      header: 'Fecha',
      mobile: 'title',
      render: (shift) => (
        <span className={styles.dateStack}>
          <strong>{formatDay(limaDay(shift.opened_at), 'weekdayShort')}</strong>
          <span className={styles.muted}>{timeFormat.format(new Date(shift.opened_at))}</span>
        </span>
      ),
    },
    ...(allStores ? [{ key: 'store', header: 'Tienda', render: (shift: RptCashShift) => shift.store_name }] : []),
    { key: 'user', header: 'Cajero', render: (shift) => shift.user_name, fallback: 'Sin nombre', muted: true },
    {
      key: 'opening',
      header: 'Apertura',
      align: 'right',
      render: (shift) =>
        shift.opening_balance === 0 ? <span className={styles.warnText}>{money(0)}</span> : money(shift.opening_balance),
    },
    {
      key: 'sales',
      header: 'Ventas al cerrar',
      align: 'right',
      render: (shift) => {
        if (shift.closed_at === null) return '—';
        const recorded = money(shift.calculated_sales ?? 0);
        return closedWithoutSales(shift) ? (
          <span className={styles.cellStack}>
            <span className={styles.warnText}>{recorded}</span>
            <span className={styles.muted}>reales: {money(shift.day_sales)}</span>
          </span>
        ) : (
          recorded
        );
      },
    },
    { key: 'expected', header: 'Esperado', align: 'right', render: (shift) => (shift.expected_balance === null ? '—' : money(shift.expected_balance)) },
    { key: 'counted', header: 'Contado', align: 'right', render: (shift) => (shift.counted_balance === null ? '—' : money(shift.counted_balance)) },
    {
      key: 'difference',
      header: 'Diferencia',
      align: 'right',
      render: (shift) => {
        if (cashState(shift) === 'open') return <Badge tone="neutral" icon="bx-lock-open-alt">Abierta</Badge>;
        const difference = shift.balance_difference ?? 0;
        const status = getCashDifferenceStatus(difference);
        return (
          <span className={styles.inlineStack}>
            {status.label !== 'Cuadra' && <strong className={styles.difference}>{signedMoney(difference)}</strong>}
            <Badge tone={status.tone} icon={status.icon}>
              {status.label}
            </Badge>
          </span>
        );
      },
    },
  ];

  return (
    <ReportSection
      id="caja"
      icon="bx-calculator"
      title="Caja"
      question="¿Cuadraron las cajas?"
      busy={data.cash.isPlaceholderData}
      actions={
        <SegmentedControl
          options={[
            { value: 'issues' as const, label: `Para revisar (${issues.length})` },
            { value: 'all' as const, label: `Todas (${shifts.length})` },
          ]}
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          ariaLabel="Qué cajas mostrar"
        />
      }
      howTo={
        <>
          <ul>
            <li>
              <strong>Esperado</strong> = apertura + ventas registradas al cerrar la caja.
            </li>
            <li>
              <strong>Diferencia</strong> = contado − esperado. <strong>Faltante</strong> (negativo): falta dinero.{' '}
              <strong>Sobrante</strong> (positivo): hay más de lo que debería. <strong>Cuadra</strong>: igual.
            </li>
            <li>
              Si una caja se cerró con <strong>ventas en S/ 0</strong> pero ese día sí hubo ventas, su diferencia no es
              confiable: probablemente se cerró sin cargar el reporte del día.
            </li>
            <li>
              <strong>Para revisar</strong> junta las cajas con faltante o sobrante, las cerradas con ventas en S/ 0 y
              las que quedaron abiertas de un día anterior (la de hoy abierta es normal).
            </li>
            <li>Las cajas se ubican por el día en que se abrieron.</li>
          </ul>
        </>
      }
    >
      <SectionStatus queries={[data.cash]} height={260}>
        {shifts.length === 0 ? (
          <SectionEmpty icon="bx-calculator">No se abrieron cajas en este período.</SectionEmpty>
        ) : (
          <div className={styles.stack}>
            <div className={styles.cashStats}>
              <StatCard
                label="Cajas cerradas"
                icon="bx-lock-alt"
                value={int(summary.closed)}
                hint={summary.open > 0 ? plural(summary.open, 'abierta', 'abiertas') : 'Ninguna abierta'}
              />
              <StatCard
                label="Cuadraron"
                icon="bx-check-circle"
                tone="success"
                value={int(summary.balanced)}
                hint={summary.closed > 0 ? `de ${plural(summary.closed, 'cerrada', 'cerradas')}` : undefined}
              />
              <StatCard
                label="Faltantes"
                icon="bx-trending-down"
                tone="danger"
                value={money(summary.shortAmount)}
                hint={plural(summary.shortCount, 'caja')}
              />
              <StatCard
                label="Sobrantes"
                icon="bx-trending-up"
                tone="warning"
                value={money(summary.overAmount)}
                hint={plural(summary.overCount, 'caja')}
              />
            </div>

            {summary.closedWithoutSales > 0 && (
              <Alert tone="warning" title={`${plural(summary.closedWithoutSales, 'caja')} con ventas en S/ 0 al cerrar`}>
                Ese día sí hubo ventas, así que su diferencia no es real. Están en la lista "Para revisar".
              </Alert>
            )}
            {summary.zeroOpening > 0 && (
              <Alert tone="info" title={`${plural(summary.zeroOpening, 'caja')} con apertura de S/ 0`}>
                Puede ser correcto, o venir de una falla del punto de venta (ya corregida en el rediseño) que guardaba la
                apertura en S/ 0. En esas cajas el esperado sale más bajo y la diferencia, corrida.
              </Alert>
            )}

            {visible.length === 0 ? (
              <SectionEmpty icon="bx-check-circle">Ninguna caja para revisar: todas cuadraron.</SectionEmpty>
            ) : (
              <>
                <div className={styles.tableScroll}>
                  <DataTable columns={columns} rows={pageRows} rowKey={(shift) => shift.shift_id} caption="Cajas del período" />
                </div>
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={visible.length}
                  pageSize={PAGE_SIZE}
                />
              </>
            )}
          </div>
        )}
      </SectionStatus>
    </ReportSection>
  );
};