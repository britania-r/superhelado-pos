// src/features/reports/ReportsPage.tsx
// Reporte de ventas completo y explicado: resumen, hallazgos, tendencia, horas pico,
// productos, categorías, pagos, tiendas y caja. Los datos vienen de las funciones rpt_*.

import { useMemo, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { usePaymentMethods, useStores } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { ReportFilters } from './components/ReportFilters';
import { SummarySection } from './sections/SummarySection';
import { InsightsSection } from './sections/InsightsSection';
import { TrendSection } from './sections/TrendSection';
import { HoursSection } from './sections/HoursSection';
import { ProductsSection } from './sections/ProductsSection';
import { CategoriesSection } from './sections/CategoriesSection';
import { PaymentsSection } from './sections/PaymentsSection';
import { StoresSection } from './sections/StoresSection';
import { CashSection } from './sections/CashSection';
import { useReportData } from './useReportData';
import { addDays, currentLimaHour, resolvePeriod, todayInLima, type DateRange, type PeriodPreset } from './lib/periods';
import {
  buildCategoryRows,
  buildPaymentRows,
  buildProductRows,
  buildStoreRows,
  productMoves,
  summarizeCash,
  totalsFromDays,
} from './lib/metrics';
import { buildInsights } from './lib/insights';
import styles from './ReportsPage.module.css';

const SECTIONS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'hallazgos', label: 'Lo más importante' },
  { id: 'tendencia', label: 'Tendencia' },
  { id: 'horas', label: 'Horas pico' },
  { id: 'productos', label: 'Productos' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'tiendas', label: 'Tiendas' },
  { id: 'caja', label: 'Caja' },
];

export const ReportsPage = () => {
  const today = todayInLima();
  const [preset, setPreset] = useState<PeriodPreset>('last7');
  const [custom, setCustom] = useState<DateRange>(() => ({ start: addDays(today, -6), end: today }));
  const [storeId, setStoreId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: ['reports'] }) > 0;
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: paymentMethods = [] } = usePaymentMethods();

  const period = useMemo(() => resolvePeriod(preset, custom, today), [preset, custom, today]);
  const allStores = storeId === null;
  const data = useReportData(period, storeId);

  /* ── Cálculos (solo cuando llegan los datos de ambos períodos) ── */
  const totals = useMemo(() => (data.days.data ? totalsFromDays(data.days.data) : undefined), [data.days.data]);
  const previousTotals = useMemo(
    () => (data.previousDays.data ? totalsFromDays(data.previousDays.data) : undefined),
    [data.previousDays.data]
  );

  const productRows = useMemo(
    () =>
      data.products.data && data.previousProducts.data
        ? buildProductRows(data.products.data, data.previousProducts.data, totals?.tickets ?? 0)
        : [],
    [data.products.data, data.previousProducts.data, totals?.tickets]
  );
  const moves = useMemo(
    () =>
      data.products.data && data.previousProducts.data
        ? productMoves(data.products.data, data.previousProducts.data)
        : { risers: [], fallers: [] },
    [data.products.data, data.previousProducts.data]
  );
  const categoryRows = useMemo(
    () =>
      data.products.data && data.previousProducts.data ? buildCategoryRows(data.products.data, data.previousProducts.data) : [],
    [data.products.data, data.previousProducts.data]
  );
  const storeRows = useMemo(
    () => (data.stores.data && data.previousStores.data ? buildStoreRows(data.stores.data, data.previousStores.data) : []),
    [data.stores.data, data.previousStores.data]
  );

  /* Cada método conserva su color: se ordena por id, no por cuánto vendió */
  const methodOrder = useMemo(() => paymentMethods.map((method) => method.id).sort((a, b) => a - b), [paymentMethods]);
  const paymentRows = useMemo(
    () =>
      data.payments.data && data.previousPayments.data
        ? buildPaymentRows(data.payments.data, data.previousPayments.data, methodOrder)
        : [],
    [data.payments.data, data.previousPayments.data, methodOrder]
  );
  const cashSummary = useMemo(() => (data.cash.data ? summarizeCash(data.cash.data) : undefined), [data.cash.data]);

  /* Hoy: ayer hasta la misma hora, para una comparación justa */
  const todaySoFar = useMemo(() => {
    if (!period.isSingleDay || !period.includesToday || !data.hours.data || !data.previousHours.data) return undefined;
    const lastHour = Math.max(currentLimaHour(), ...data.hours.data.map((row) => row.hour));
    const previousSales = data.previousHours.data
      .filter((row) => row.hour <= lastHour)
      .reduce((sum, row) => sum + row.total_sales, 0);
    return { lastHour, previousSales };
  }, [period.isSingleDay, period.includesToday, data.hours.data, data.previousHours.data]);

  const insights = useMemo(
    () =>
      buildInsights({
        period,
        totals,
        previousTotals,
        days: data.days.data,
        hours: data.hours.data,
        products: productRows.length > 0 ? productRows : undefined,
        moves: data.previousProducts.data && data.previousProducts.data.length > 0 ? moves : undefined,
        payments: paymentRows.length > 0 ? paymentRows : undefined,
        stores: allStores && storeRows.length > 0 ? storeRows : undefined,
        withoutSalesCount: data.withoutSales.data?.length,
        cash: cashSummary,
        todaySoFar,
      }),
    [
      period,
      totals,
      previousTotals,
      data.days.data,
      data.hours.data,
      productRows,
      data.previousProducts.data,
      moves,
      paymentRows,
      allStores,
      storeRows,
      data.withoutSales.data,
      cashSummary,
      todaySoFar,
    ]
  );

  const visibleSections = SECTIONS.filter((section) => section.id !== 'tiendas' || allStores);

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Cómo van tus ventas, explicado paso a paso."
        actions={
          <Button
            variant="secondary"
            icon="bx-refresh"
            loading={fetching}
            iconOnlyOnMobile
            onClick={() => queryClient.invalidateQueries({ queryKey: ['reports'] })}
          >
            Actualizar
          </Button>
        }
      />

      <ReportFilters
        preset={preset}
        onPresetChange={setPreset}
        custom={custom}
        onCustomChange={setCustom}
        storeId={storeId}
        onStoreChange={setStoreId}
        stores={stores}
        storesLoading={storesLoading}
        period={period}
      />

      {/* Índice: saltar a cada parte del reporte */}
      <nav className={styles.toc} aria-label="Partes del reporte">
        <span className={styles.tocLabel}>Ir a:</span>
        {visibleSections.map((section) => (
          <button key={section.id} type="button" className={styles.tocLink} onClick={() => goTo(section.id)}>
            {section.label}
          </button>
        ))}
      </nav>

      <div className={styles.sections}>
        {period.isSingleDay && period.includesToday && (
          <Alert tone="info" title="El día de hoy aún no termina">
            Los números siguen creciendo con cada venta, así que las tarjetas comparan con ayer completo y pueden verse
            bajas. Para una comparación justa, mira "Lo más importante" (ayer hasta la misma hora) y la tendencia hora
            por hora.
          </Alert>
        )}

        <SummarySection period={period} data={data} totals={totals} previousTotals={previousTotals} />
        <InsightsSection insights={insights} loading={data.days.isPending} />
        <TrendSection period={period} data={data} />
        <HoursSection period={period} data={data} />
        <ProductsSection period={period} data={data} rows={productRows} moves={moves} allStores={allStores} />

        <div className={styles.grid2}>
          <CategoriesSection period={period} data={data} rows={categoryRows} />
          <PaymentsSection period={period} data={data} rows={paymentRows} />
        </div>

        {allStores && <StoresSection period={period} data={data} rows={storeRows} />}
        <CashSection data={data} allStores={allStores} />
      </div>
    </div>
  );
};