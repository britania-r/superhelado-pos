// src/api/shifts.api.ts

import { supabase } from "../config/supabaseClient";
import type { CashShift } from "../types";

// Obtener el turno de caja abierto para un usuario en una tienda específica
export const getOpenCashShift = async (userId: string, storeId: string): Promise<CashShift | null> => {
  const { data, error } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .is('closed_at', null) // Buscar turnos que no estén cerrados
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 es "No rows found"
    console.error("Error fetching open cash shift:", error);
    throw new Error(error.message);
  }
  return data;
};

// Abrir un nuevo turno de caja
export const openCashShift = async (userId: string, storeId: string, openingBalance: number): Promise<CashShift> => {
  const { data, error } = await supabase
    .from('cash_shifts')
    .insert({
      user_id: userId,
      store_id: storeId,
      opening_balance: openingBalance,
    })
    .select('*')
    .single();

  if (error) {
    console.error("Error opening cash shift:", error);
    throw new Error(error.message);
  }
  return data;
};

// Cerrar un turno de caja existente
export const closeCashShift = async (shiftId: number, closingBalance: number, calculatedSales: number): Promise<CashShift> => {
  const { data, error } = await supabase
    .from('cash_shifts')
    .update({
      closed_at: new Date().toISOString(), // Fecha y hora actual
      closing_balance: closingBalance,
      calculated_sales: calculatedSales,
    })
    .eq('id', shiftId)
    .select('*')
    .single();

  if (error) {
    console.error("Error closing cash shift:", error);
    throw new Error(error.message);
  }
  return data;
};

// En src/api/shifts.api.ts

// ... (tus otras importaciones y funciones)

export const v2_closeCashShift = async (payload: {
  shiftId: number;
  closingBalance: number;
  calculatedSales: number;
  countedBalance: number;
}) => {
  const { error } = await supabase.rpc('v2_close_cash_shift', {
    p_shift_id: payload.shiftId,
    p_closing_balance: payload.closingBalance,
    p_calculated_sales: payload.calculatedSales,
    p_counted_balance: payload.countedBalance,
  });

  if (error) {
    console.error('Error closing cash shift:', error);
    throw new Error('No se pudo cerrar la caja.');
  }
};


// Obtener el historial de turnos de caja (para admin o vendedor su propio historial)
export const getCashShiftHistory = async (): Promise<CashShift[]> => {
    const { data, error } = await supabase
        .from('cash_shifts')
        .select(`
            *,
            stores (name),
            profiles (full_name)
        `)
        .order('opened_at', { ascending: false });

    if (error) {
        console.error("Error fetching cash shift history:", error);
        throw new Error(error.message);
    }
    return data || [];
};