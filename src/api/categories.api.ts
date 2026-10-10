import { supabase } from "../config/supabaseClient";
import type { Category } from "../types";

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const createCategory = async (name: string): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name }])
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    throw new Error(error.message);
  }

  return data;
};

export const updateCategory = async (id: number, name: string): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error);
    throw new Error(error.message);
  }

  return data;
};

export const deleteCategory = async (id: number): Promise<void> => {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting category:", error);
        throw new Error(error.message);
    }
};