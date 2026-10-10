// src/api/paymentMethods.api.ts

import { supabase } from "../config/supabaseClient";
import type { PaymentMethod } from "../types";

// Obtener todos los métodos de pago
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching payment methods:", error);
    throw new Error(error.message);
  }

  return data || [];
};

// Crear un nuevo método de pago
export const createPaymentMethod = async (methodData: { name: string; description?: string }): Promise<PaymentMethod> => {
  const { data, error } = await supabase
    .from('payment_methods')
    .insert([methodData])
    .select()
    .single();

  if (error) {
    console.error("Error creating payment method:", error);
    throw new Error(error.message);
  }

  return data;
};

// Actualizar un método de pago existente
export const updatePaymentMethod = async (id: number, methodData: { name: string; description?: string }): Promise<PaymentMethod> => {
  const { data, error } = await supabase
    .from('payment_methods')
    .update(methodData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating payment method:", error);
    throw new Error(error.message);
  }

  return data;
};

// Borrar un método de pago
export const deletePaymentMethod = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting payment method:", error);
        throw new Error(error.message);
    }
};