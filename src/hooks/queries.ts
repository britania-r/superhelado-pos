// src/hooks/queries.ts

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getSales, getDailyProductSummary } from '../api/sales.api';
import { getStores, deleteStore } from '../api/stores.api';
import { getAllProfilesForAdmin, createNewUser, updateProfile, deleteUserById, type CreateUserData, type UpdateProfileData } from '../api/profiles.api';
import { getPaymentMethods, deletePaymentMethod } from '../api/paymentMethods.api';
import { getCategories, deleteCategory } from '../api/categories.api';
import {
  getProducts,
  getPosProducts,
  getProductDetails,
  deleteProduct,
  upsertProduct,
  setStoreProductActive,
  type UpsertProductData,
} from '../api/products.api';
import type { ProductWithDetails } from '../types';

// ─── Stores ───
export const useStores = () => {
  return useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  });
};

export const useDeleteStore = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
};

// ─── Sales ───
export const useSales = (date: string, storeId: string | null) => {
  return useQuery({
    queryKey: ['sales', date, storeId],
    queryFn: () => getSales(date, storeId),
    enabled: !!date,
  });
};

export const useDailyProductSummary = (date: string, storeId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['daily-product-summary', date, storeId],
    queryFn: () => getDailyProductSummary(date, storeId),
    enabled,
  });
};

// ─── Users / Profiles ───
export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: getAllProfilesForAdmin,
  });
};

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserData) => createNewUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileData }) => updateProfile(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUserById(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
};

// ─── Payment Methods ───
export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: getPaymentMethods,
  });
};

export const useDeletePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (methodId: number) => deletePaymentMethod(methodId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
};

// ─── Categories ───
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

// ─── Products ───

/* Cada cuánto el POS vuelve a pedir productos por su cuenta.
   Así una caja abierta en OTRO dispositivo ve los cambios sin recargar. */
const POS_REFETCH_INTERVAL_MS = 60_000;

/* Refresca todo lo que muestra productos: gestión, detalle y POS (todas las tiendas).
   ['pos-products'] invalida también ['pos-products', <cualquier tienda>]. */
const invalidateProductQueries = (qc: QueryClient, productId?: string) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ['products'] }),
    qc.invalidateQueries({ queryKey: ['pos-products'] }),
    productId ? qc.invalidateQueries({ queryKey: ['product', productId] }) : Promise.resolve(),
  ]);

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });
};

export const useProductDetails = (productId: string | undefined) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProductDetails(productId!),
    enabled: !!productId,
  });
};

/* Productos del POS para una tienda: solo los asignados y ACTIVOS en ella. */
export const usePosProducts = (storeId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['pos-products', storeId],
    queryFn: () => getPosProducts(storeId!),
    enabled: enabled && !!storeId,
    staleTime: 30_000,
    refetchInterval: POS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};

export const useUpsertProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, productId }: { data: UpsertProductData; productId?: string }) =>
      upsertProduct(data, productId),
    onSuccess: (_result, { productId }) => invalidateProductQueries(qc, productId),
  });
};

interface SetStoreProductActiveVars {
  productId: string;
  storeIds: string[];
  isActive: boolean;
}

interface SetStoreProductActiveContext {
  previousDetail?: ProductWithDetails | null;
  previousList?: ProductWithDetails[];
}

/* Activa / desactiva un producto en una o varias tiendas.
   Actualización optimista: el switch cambia al instante y, si falla, vuelve atrás. */
export const useSetStoreProductActive = () => {
  const qc = useQueryClient();

  return useMutation<void, Error, SetStoreProductActiveVars, SetStoreProductActiveContext>({
    mutationFn: ({ productId, storeIds, isActive }) =>
      setStoreProductActive(productId, storeIds, isActive),

    onMutate: async ({ productId, storeIds, isActive }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ['product', productId] }),
        qc.cancelQueries({ queryKey: ['products'] }),
      ]);

      const previousDetail = qc.getQueryData<ProductWithDetails | null>(['product', productId]);
      const previousList = qc.getQueryData<ProductWithDetails[]>(['products']);

      const applyChange = (product: ProductWithDetails): ProductWithDetails =>
        product.id !== productId
          ? product
          : {
              ...product,
              store_products: product.store_products.map((link) =>
                storeIds.includes(link.store_id) ? { ...link, is_active: isActive } : link
              ),
            };

      if (previousDetail) qc.setQueryData(['product', productId], applyChange(previousDetail));
      if (previousList) qc.setQueryData(['products'], previousList.map(applyChange));

      return { previousDetail, previousList };
    },

    onError: (_error, { productId }, context) => {
      if (!context) return;
      if (context.previousDetail !== undefined) qc.setQueryData(['product', productId], context.previousDetail);
      if (context.previousList !== undefined) qc.setQueryData(['products'], context.previousList);
    },

    onSettled: (_data, _error, { productId }) => invalidateProductQueries(qc, productId),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    // No se invalida ['product', id]: la página de detalle navega fuera al borrar
    onSuccess: () => invalidateProductQueries(qc),
  });
};