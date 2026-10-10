// src/api/products.api.ts
import { supabase } from '../config/supabaseClient';
import type { Product, ProductWithDetails } from '../types';

/* Producto con su categoría y TODAS sus tiendas (activas o no).
   Lo usan la gestión y el detalle. */
const PRODUCT_WITH_STORES_SELECT = `
  *,
  categories (name),
  store_products (store_id, price, is_active, stores (name))
`;

// 1. Obtener todos los productos para la página de GESTIÓN (vista de admin)
export const getProducts = async (): Promise<ProductWithDetails[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_WITH_STORES_SELECT)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching admin products:', error);
    throw new Error(error.message);
  }
  return data || [];
};

// 2. Productos para el PUNTO DE VENTA de UNA tienda.
//    El filtro se hace en el servidor: solo llegan productos asignados a esa
//    tienda y ACTIVOS en ella (store_products!inner descarta el resto).
export const getPosProducts = async (storeId: string): Promise<ProductWithDetails[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (name),
      store_products!inner (store_id, price, is_active)
    `)
    .eq('store_products.store_id', storeId)
    .eq('store_products.is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching POS products:', error);
    throw new Error(error.message);
  }

  return data || [];
};

// 3. Obtener los detalles de un solo producto (para la vista única)
//    Trae toda la info, incluyendo todos los precios y estados por tienda
export const getProductDetails = async (productId: string): Promise<ProductWithDetails | null> => {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_WITH_STORES_SELECT)
    .eq('id', productId)
    .single();

  if (error) {
    console.error(`Error fetching product details for ${productId}:`, error);
    return null;
  }
  return data;
};

// 4. Borrar un producto
export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    // 23503 = violación de llave foránea: el producto tiene ventas registradas
    if (error.code === '23503') {
      throw new Error(
        'Este producto tiene ventas registradas y no se puede eliminar. ' +
        'Desactívalo en las tiendas para ocultarlo del Punto de Venta.'
      );
    }
    throw new Error(error.message);
  }
};

// 5. Crear o Actualizar un producto (Upsert)
export interface StorePriceInput {
  store_id: string;
  price: number;
  is_active: boolean;
}

export interface UpsertProductData {
  name: string;
  description?: string | null;
  category_id: number;
  imageFile?: File;
  image_url?: string | null; // Para pasar la URL existente
  storePrices: StorePriceInput[];
}

export const upsertProduct = async (productData: UpsertProductData, existingProductId?: string) => {
  let imageUrl = productData.image_url || null;

  // Manejo de la imagen (Subida a Storage)
  if (productData.imageFile) {
    const file = productData.imageFile;
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) throw new Error(`Error subiendo imagen: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    imageUrl = urlData.publicUrl;
  }

  // Preparar los datos para la tabla 'products'
  const productPayload: Omit<Product, 'id'> = {
    name: productData.name,
    description: productData.description || null,
    category_id: productData.category_id,
    image_url: imageUrl,
  };

  // Crear o actualizar el producto
  const { data: product, error: productError } = await supabase
    .from('products')
    .upsert(existingProductId ? { id: existingProductId, ...productPayload } : productPayload)
    .select('id') // Solo necesitamos el ID para vincular los precios
    .single();

  if (productError) throw new Error(`Error guardando producto: ${productError.message}`);

  // Sincronizar tiendas, precios y estado en 'store_products'.
  // Primero se guardan las tiendas marcadas y DESPUÉS se quitan las desmarcadas:
  // si algo falla a mitad de camino, el producto nunca se queda sin tiendas.

  // 1. Upsert de las tiendas marcadas (crea las nuevas y actualiza precio/estado de las existentes)
  if (productData.storePrices.length > 0) {
    const storeRows = productData.storePrices.map((sp) => ({
      product_id: product.id,
      store_id: sp.store_id,
      price: sp.price,
      is_active: sp.is_active,
    }));

    const { error: upsertStoresError } = await supabase
      .from('store_products')
      .upsert(storeRows, { onConflict: 'store_id,product_id' });

    if (upsertStoresError) {
      throw new Error(`Error asignando precios por tienda: ${upsertStoresError.message}`);
    }
  }

  // 2. Quitar solo las tiendas que se desmarcaron (aplica al editar)
  if (existingProductId) {
    const selectedStoreIds = productData.storePrices.map((sp) => sp.store_id);

    let deleteQuery = supabase
      .from('store_products')
      .delete()
      .eq('product_id', product.id);

    if (selectedStoreIds.length > 0) {
      deleteQuery = deleteQuery.not('store_id', 'in', `(${selectedStoreIds.join(',')})`);
    }

    const { error: deleteStoresError } = await deleteQuery;

    if (deleteStoresError) {
      throw new Error(`Error quitando tiendas desmarcadas: ${deleteStoresError.message}`);
    }
  }

  return product;
};

// 6. Activar / desactivar un producto en una o varias tiendas.
//    El producto sigue asignado a la tienda y conserva su precio.
export const setStoreProductActive = async (
  productId: string,
  storeIds: string[],
  isActive: boolean,
): Promise<void> => {
  if (storeIds.length === 0) return;

  const { data, error } = await supabase
    .from('store_products')
    .update({ is_active: isActive })
    .eq('product_id', productId)
    .in('store_id', storeIds)
    .select('store_id');

  if (error) {
    console.error('Error updating store product status:', error);
    throw new Error(error.message);
  }

  // Con RLS, un usuario sin permiso no recibe error: simplemente no se actualiza nada
  if (!data || data.length === 0) {
    throw new Error('No se actualizó ninguna tienda. Verifica que tengas permisos de administrador.');
  }
};