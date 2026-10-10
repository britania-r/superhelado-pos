// src/api/stores.api.ts

import { supabase } from "../config/supabaseClient";
import type { Store } from "../types";

// Obtener todas las tiendas
export const getStores = async (): Promise<Store[]> => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching stores:", error);
    throw new Error(error.message);
  }

  return data || [];
};

// Crear una nueva tienda
export const createStore = async (storeData: { name: string; address?: string }): Promise<Store> => {
  const { data, error } = await supabase
    .from('stores')
    .insert([storeData])
    .select()
    .single();

  if (error) {
    console.error("Error creating store:", error);
    throw new Error(error.message);
  }

  return data;
};

// --- AÑADIDO: Actualizar una tienda existente ---
export const updateStore = async (id: string, storeData: { name: string; address?: string }): Promise<Store> => {
  const { data, error } = await supabase
    .from('stores')
    .update(storeData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating store:", error);
    throw new Error(error.message);
  }

  return data;
};

// Borrar una tienda
export const deleteStore = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting store:", error);
        throw new Error(error.message);
    }
};