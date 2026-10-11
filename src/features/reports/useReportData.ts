// src/features/reports/useReportData.ts
// Consultas del reporte. Cada sección carga por su cuenta (y en paralelo),
// así lo primero que llega se muestra sin esperar al resto.

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getReportCashShifts,
  getReportProductsWithoutSales,
  getReportSalesByDay,
  getReportSalesByHour,
  getReportSalesByPaymentMethod,
  getReportSalesByProduct,
  getReportSalesByStore,
  type ReportRange,
} from '../../api/reports.api';
import type { ReportPeriod } from './lib/periods';

/* Al cambiar el filtro se mantiene lo anterior (atenuado) hasta que llegan los datos nuevos */
const COMMON = {
  placeholderData: keepPreviousData,
  staleTime: 60_000,
  retry: 1,
} as const;

const useReportQuery = <T>(name: string, range: ReportRange | null, fetcher: (range: ReportRange) => Promise<T>, enabled = true) =>
  useQuery({
    queryKey: ['reports', name, range?.start, range?.end, range?.storeId ?? 'all'],
    queryFn: () => fetcher(range!),
    enabled: enabled && range !== null,
    ...COMMON,
  });

export const useReportData = (period: ReportPeriod | null, storeId: string | null) => {
  const current = period ? { ...period.current, storeId } : null;
  const previous = period ? { ...period.previous, storeId } : null;
  const allStores = storeId === null;

  return {
    days: useReportQuery('days', current, getReportSalesByDay),
    previousDays: useReportQuery('days', previous, getReportSalesByDay),
    hours: useReportQuery('hours', current, getReportSalesByHour),
    /* Solo para comparar hora por hora cuando el período es un día */
    previousHours: useReportQuery('hours', previous, getReportSalesByHour, period?.isSingleDay ?? false),
    products: useReportQuery('products', current, getReportSalesByProduct),
    previousProducts: useReportQuery('products', previous, getReportSalesByProduct),
    stores: useReportQuery('stores', current, getReportSalesByStore, allStores),
    previousStores: useReportQuery('stores', previous, getReportSalesByStore, allStores),
    payments: useReportQuery('payments', current, getReportSalesByPaymentMethod),
    previousPayments: useReportQuery('payments', previous, getReportSalesByPaymentMethod),
    withoutSales: useReportQuery('without-sales', current, getReportProductsWithoutSales),
    cash: useReportQuery('cash', current, getReportCashShifts),
  };
};

export type ReportData = ReturnType<typeof useReportData>;