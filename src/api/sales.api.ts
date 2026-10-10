// src/api/sales.api.ts
import { supabase } from '../config/supabaseClient';
import type { Sale } from '../types';
import type { DailyProductSummary } from '../types';

/* Zona horaria de Perú (UTC-5). Cámbiala si operas en otra. */
const TZ_OFFSET = '-05:00';

/* ════════════════════════════════════════════════════════ */
/* 1. Registrar una venta                                    */
/* ════════════════════════════════════════════════════════ */
interface RecordSalePayload {
  store_id: string;
  /** Se mantiene por compatibilidad: el servidor usa el usuario de la sesión */
  user_id: string;
  /** Referencial: el servidor recalcula el total con los precios de la BD */
  total_amount: number;
  payment_method_id: number;
  paid_amount: number;
  change_amount: number;
  items: Array<{
    product_id: string;
    quantity: number;
    price_at_sale: number;
  }>;
}

/* Códigos que devuelve record_sale (campo "hint" del error) */
export type SaleErrorCode =
  | 'PRODUCT_INACTIVE'
  | 'PRICE_CHANGED'
  | 'INVALID_SALE'
  | 'INVALID_PAYMENT'
  | 'NOT_AUTHENTICATED'
  | 'UNKNOWN';

const KNOWN_SALE_ERROR_CODES: readonly SaleErrorCode[] = [
  'PRODUCT_INACTIVE',
  'PRICE_CHANGED',
  'INVALID_SALE',
  'INVALID_PAYMENT',
  'NOT_AUTHENTICATED',
];

/* Producto afectado (campo "details" del error, en JSON) */
export interface SaleErrorProduct {
  product_id: string;
  name: string;
  old_price?: number | null;
  new_price?: number | null;
}

/* Error de venta con información para que la UI pueda reaccionar */
export class SaleError extends Error {
  readonly code: SaleErrorCode;
  readonly products: SaleErrorProduct[];

  constructor(message: string, code: SaleErrorCode, products: SaleErrorProduct[] = []) {
    super(message);
    this.name = 'SaleError';
    this.code = code;
    this.products = products;
  }
}

const toSaleError = (error: { message: string; details?: string | null; hint?: string | null }): SaleError => {
  const code = KNOWN_SALE_ERROR_CODES.find((known) => known === error.hint) ?? 'UNKNOWN';

  let products: SaleErrorProduct[] = [];
  if (error.details) {
    try {
      const parsed: unknown = JSON.parse(error.details);
      if (Array.isArray(parsed)) products = parsed as SaleErrorProduct[];
    } catch {
      // "details" no viene en JSON (errores de Postgres que no son nuestros): se ignora
    }
  }

  return new SaleError(error.message, code, products);
};

export const recordSale = async (
  payload: RecordSalePayload
): Promise<{ sale_id: string; total_amount: number }> => {
  const { data, error } = await supabase.rpc('record_sale', {
    p_sale_data: payload,
  });

  if (error) {
    console.error('Error recording sale via RPC:', error);
    throw toSaleError(error);
  }

  return data;
};

/* ════════════════════════════════════════════════════════ */
/* 2. Obtener ventas con filtros opcionales                 */
/*    - date    : 'YYYY-MM-DD'                              */
/*    - storeId : uuid o null                               */
/*                                                          */
/*    Una sola consulta con las relaciones embebidas.       */
/*    Antes se llamaba a la RPC y luego se hacía un         */
/*    .in('id', [...]) con todos los UUIDs del día, lo que  */
/*    generaba una URL enorme y el gateway la rechazaba     */
/*    con 400 Bad Request.                                  */
/* ════════════════════════════════════════════════════════ */
export const getSales = async (
  date: string,
  storeId: string | null
): Promise<Sale[]> => {
  // Límites del día en hora local, convertidos a timestamp con zona horaria.
  const dayStart = `${date}T00:00:00${TZ_OFFSET}`;

  const nextDay = new Date(`${date}T12:00:00${TZ_OFFSET}`);
  nextDay.setDate(nextDay.getDate() + 1);
  const y = nextDay.getFullYear();
  const m = String(nextDay.getMonth() + 1).padStart(2, '0');
  const d = String(nextDay.getDate()).padStart(2, '0');
  const dayEnd = `${y}-${m}-${d}T00:00:00${TZ_OFFSET}`;

  let query = supabase
    .from('sales')
    .select(
      `
        *,
        stores!sales_store_id_fkey (name),
        profiles!sales_user_id_fkey (full_name),
        payment_methods!sales_payment_method_id_fkey (name)
      `
    )
    .gte('created_at', dayStart)
    .lt('created_at', dayEnd)
    .order('created_at', { ascending: false });

  if (storeId) {
    query = query.eq('store_id', storeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sales:', JSON.stringify(error, null, 2));
    throw new Error(error.message || 'No se pudieron cargar las ventas');
  }

  return data ?? [];
};

/* ════════════════════════════════════════════════════════ */
/* 3. Resumen diario de productos                           */
/* ════════════════════════════════════════════════════════ */
export const getDailyProductSummary = async (
  date: string,
  storeId: string | null
): Promise<DailyProductSummary[]> => {
  const { data, error } = await supabase.rpc('report_daily_product_summary', {
    p_date: date,
    p_store_id: storeId,
  });

  if (error) {
    console.error('Error fetching daily product summary:', error);
    throw new Error(error.message);
  }

  return data ?? [];
};

/* ════════════════════════════════════════════════════════ */
/* 4. Detalle de una venta                                  */
/* ════════════════════════════════════════════════════════ */
export const getSaleDetails = async (saleId: string): Promise<Sale | null> => {
  const { data, error } = await supabase.rpc('get_full_sale_details', {
    p_sale_id: saleId,
  });

  if (error) {
    console.error('Error fetching sale details:', error);
    throw new Error(error.message);
  }

  if (!data?.sale) {
    return null;
  }

  return {
    ...data.sale,
    sale_items: data.sale_items ?? [],
  };
};