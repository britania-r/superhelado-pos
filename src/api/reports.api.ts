// FILE: src/api/reports.api.ts
// DESC: Reemplaza todo el contenido de este archivo con el código de abajo.

import { supabase } from '../config/supabaseClient';
import type {
  ReportSalesByStoreResult,
  ReportSalesByProductResult,
  ReportTopSoldProductsResult,
  DailyCashSummaryResult,
  ReportSalesByPaymentMethodResult,
  ReportTotalSalesSummaryResult,
  V2ReportSalesByProductResult, // <-- AÑADIDO: El nuevo tipo de resultado
  V3ReportSalesByProductResult,
  DetailedSaleExportRow,
  V2ReportSalesByPaymentMethodResult,
  V2DailyCashSummaryResult,
  V3DailyCashSummaryResult,
} from '../types';

const toNull = <T>(v: T | undefined | null) => (v === undefined ? null : v);

/*────────────────────────── Reporte diario ──────────────────────────*/
export const getDailySalesByStore = (date: string, storeId?: string | null) =>
  rpc<ReportSalesByStoreResult>('report_daily_sales_by_store', {
    p_date: date,
    p_store_id: toNull(storeId),
  });

export const getDailySalesByProduct = (date: string, storeId?: string | null) =>
  rpc<ReportSalesByProductResult>('report_daily_sales_by_product', {
    p_date: date,
    p_store_id: toNull(storeId),
  });

export const getDailyTopSoldProducts = (
  date: string,
  limit = 10,
  storeId?: string | null
) =>
  rpc<ReportTopSoldProductsResult>('report_daily_top_sold_products', {
    p_date: date,
    p_limit: limit,
    p_store_id: toNull(storeId),
  });

export const getDailySalesByPaymentMethod = (
  date: string,
  storeId?: string | null
) =>
  rpc<ReportSalesByPaymentMethodResult>('report_daily_sales_by_payment_method', {
    p_date: date,
    p_store_id: toNull(storeId),
  });

//
// ==================================================================
// ==                 NUEVA FUNCIÓN AÑADIDA AQUÍ                   ==
// ==================================================================
//
export const v2_getDailySalesByProduct = (
  date: string,
  storeId?: string | null
) =>
  rpc<V2ReportSalesByProductResult>('v2_report_daily_sales_by_product', {
    p_date: date,
    p_store_id: toNull(storeId),
  });
// ==================================================================
//

/*────────────────────────── Reporte entre fechas ──────────────────────────*/
export const getSalesBetweenDatesByStore = (
  start: string,
  end: string,
  storeId?: string | null
) =>
  rpc<ReportSalesByStoreResult>('report_sales_between_dates_by_store', {
    p_start_date: start,
    p_end_date: end,
    p_store_id: toNull(storeId),
  });

export const getSalesBetweenDatesByProduct = (
  start: string,
  end: string,
  storeId?: string | null
) =>
  rpc<ReportSalesByProductResult>('report_sales_between_dates_by_product', {
    p_start_date: start,
    p_end_date: end,
    p_store_id: toNull(storeId),
  });

export const getTopSoldProductsBetweenDates = (
  start: string,
  end: string,
  limit = 10,
  storeId?: string | null
) =>
  rpc<ReportTopSoldProductsResult>('report_top_sold_products_between_dates', {
    p_start_date: start,
    p_end_date: end,
    p_limit: limit,
    p_store_id: toNull(storeId),
  });

export const getSalesBetweenDatesByPaymentMethod = (
  start: string,
  end: string,
  storeId?: string | null
) =>
  rpc<ReportSalesByPaymentMethodResult>('report_sales_between_dates_by_payment_method', {
    p_start_date: start,
    p_end_date: end,
    p_store_id: toNull(storeId),
  });

/*────────── Resumen & caja ──────────*/
export const getTotalSalesSummary = (
  date?: string | null,
  start?: string | null,
  end?: string | null,
  storeId?: string | null
) =>
  rpcSingle<ReportTotalSalesSummaryResult>('report_total_sales_summary', {
    p_date: toNull(date),
    p_start_date: toNull(start),
    p_end_date: toNull(end),
    p_store_id: toNull(storeId),
  });

export const getDailyCashSummary = (date: string, storeId?: string | null) =>
  rpc<DailyCashSummaryResult>('report_daily_cash_summary', {
    p_date: date,
    p_store_id: toNull(storeId),
  });

export const v3_getDailySalesByProduct = (date: string, storeId: string) =>
  // Usa el nuevo tipo V3ReportSalesByProductResult
  rpc<V3ReportSalesByProductResult>('v3_report_daily_sales_by_product', {
    p_date: date,
    p_store_id: storeId,
  });

export const getDetailedSalesForExport = (startDate: string, endDate: string, storeId: string) =>
  rpc<DetailedSaleExportRow>('report_detailed_sales_export', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_store_id: storeId,
  });

export const v2_getDailySalesByPaymentMethod = (date: string, storeId:string) =>
  rpc<V2ReportSalesByPaymentMethodResult>('v2_report_daily_sales_by_payment_method', {
    p_date: date,
    p_store_id: storeId,
  });

export const v2_getDailyCashSummary = (date: string, storeId: string | null) =>
  rpc<V2DailyCashSummaryResult>('v2_report_daily_cash_summary', {
    p_date: date,
    p_store_id: storeId,
  });

export const v3_getDailyCashSummary = (date: string, storeId: string | null) =>
  rpc<V3DailyCashSummaryResult>('v3_report_daily_cash_summary', {
    p_date: date,
    p_store_id: storeId,
  });
  
/*────────── Helpers genéricos ──────────*/
async function rpc<T>(fn: string, params: Record<string, any>) {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

async function rpcSingle<T>(fn: string, params: Record<string, any>) {
  const rows = await rpc<T>(fn, params);
  return rows[0] ?? null;
}