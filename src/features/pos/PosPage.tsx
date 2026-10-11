// src/features/pos/PosPage.tsx

import { useState, useMemo, useEffect } from 'react';
import { useCategories, useStores, usePosProducts } from '../../hooks/queries';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { cx } from '../../lib/cx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect';
import { ChipGroup, type ChipOption } from '../../components/ui/ChipGroup';
import { ProductGrid } from './components/ProductGrid';
import { Cart } from './components/Cart';
import styles from './PosPage.module.css';

/* Valor de "Todos" en las categorías (los ids de categoría son números) */
const ALL_CATEGORIES = 'all';

export const PosPage = () => {
  const { profile, user, isLoading: isProfileLoading } = useUserStore();

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  /* Tienda elegida que espera confirmación (cambiar de tienda vacía el pedido) */
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);

  // El carrito sabe a qué tienda pertenece el pedido (así no se mezclan precios)
  const cartStoreId = useCartStore((state) => state.storeId);
  const cartItemCount = useCartStore((state) => state.items.length);
  const setCartStore = useCartStore((state) => state.setStore);
  const addToCart = useCartStore((state) => state.addToCart);

  const { data: categories = [] } = useCategories();
  const { data: stores = [], isLoading: isLoadingStores } = useStores();

  // Vendedor: siempre su tienda. Admin: la del pedido actual, o la primera.
  const effectiveStoreId = useMemo(() => {
    if (!profile) return null;
    if (profile.role === 'vendedor') return profile.store_id ?? null;
    if (cartStoreId && stores.some((store) => store.id === cartStoreId)) return cartStoreId;
    return stores[0]?.id ?? null;
  }, [profile, cartStoreId, stores]);

  // Ata el carrito a la tienda activa (si cambia de tienda, el pedido se vacía)
  useEffect(() => {
    if (effectiveStoreId && effectiveStoreId !== cartStoreId) {
      setCartStore(effectiveStoreId);
    }
  }, [effectiveStoreId, cartStoreId, setCartStore]);

  // Solo productos ACTIVOS de esta tienda (filtrado en el servidor, refresco cada 60 s)
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    isError: isProductsError,
    error: productsError,
  } = usePosProducts(effectiveStoreId, !isProfileLoading && !!profile && !!user);

  const productsToDisplay = useMemo(() => {
    const lower = searchTerm.toLowerCase();

    return products.filter((product) => {
      const link = product.store_products.find((sp) => sp.store_id === effectiveStoreId);
      if (!link || !link.is_active) return false;

      const matchesCategory = activeCategory === null || product.category_id === activeCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(lower) ||
        (product.description?.toLowerCase().includes(lower) ?? false);

      return matchesCategory && matchesSearch;
    });
  }, [products, effectiveStoreId, activeCategory, searchTerm]);

  const handleStoreChange = (newStoreId: string) => {
    if (newStoreId === effectiveStoreId) return;

    // Con productos en el pedido, primero se confirma. El selector es controlado:
    // mientras tanto sigue mostrando la tienda anterior.
    if (cartItemCount > 0) {
      setPendingStoreId(newStoreId);
      return;
    }

    setCartStore(newStoreId);
  };

  const confirmStoreChange = () => {
    if (pendingStoreId) setCartStore(pendingStoreId);
    setPendingStoreId(null);
  };

  const storeOptions = useMemo<SelectOption[]>(
    () => stores.map((store) => ({ value: store.id, label: store.name, icon: 'bx-store-alt' })),
    [stores]
  );

  const categoryOptions = useMemo<ChipOption<string>[]>(
    () => [
      { value: ALL_CATEGORIES, label: 'Todos' },
      ...categories.map((category) => ({ value: String(category.id), label: category.name })),
    ],
    [categories]
  );

  if (isProfileLoading || isLoadingStores) {
    return (
      <div className={styles.status}>
        <Spinner size="lg" label="" />
        <p>Cargando punto de venta…</p>
      </div>
    );
  }

  if (!profile || (profile.role === 'vendedor' && !profile.store_id)) {
    return (
      <EmptyState
        tone="danger"
        icon="bx-store-alt"
        title="No se puede cargar el punto de venta"
        description="Asegúrate de que tu usuario tenga una tienda asignada."
      />
    );
  }

  if (!effectiveStoreId) {
    return (
      <EmptyState
        icon="bx-store-alt"
        title="No hay tiendas disponibles"
        description="Crea al menos una tienda en Gestión › Tiendas."
      />
    );
  }

  const isAdmin = profile.role === 'admin';
  const storeName = stores.find((store) => store.id === effectiveStoreId)?.name;
  const hasFilters = searchTerm !== '' || activeCategory !== null;
  const productCount = isLoadingProducts
    ? 'Cargando…'
    : `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`;

  const clearFilters = () => {
    setSearchTerm('');
    setActiveCategory(null);
  };

  return (
    <div className={styles.pos}>
      <section className={styles.catalog} aria-label="Productos">
        <div className={styles.toolbar}>
          <div className={cx(styles.heading, isAdmin && styles.hasStoreSelect)}>
            <div className={styles.titles}>
              <h1 className={styles.title}>Punto de venta</h1>
              <p className={styles.subtitle}>
                {isAdmin ? productCount : `${storeName ?? 'Tienda'} · ${productCount}`}
              </p>
            </div>
            {isAdmin && (
              <SearchableSelect
                options={storeOptions}
                value={effectiveStoreId}
                onChange={handleStoreChange}
                icon="bx-store-alt"
                label="Tienda"
                searchPlaceholder="Buscar tienda…"
                emptyMessage="No hay tiendas con ese nombre"
                className={styles.storeSelect}
              />
            )}
          </div>

          <Input
            type="search"
            icon="bx-search"
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
          />

          <ChipGroup
            options={categoryOptions}
            value={activeCategory === null ? ALL_CATEGORIES : String(activeCategory)}
            onChange={(value) => setActiveCategory(value === ALL_CATEGORIES ? null : Number(value))}
            ariaLabel="Categorías"
          />
        </div>

        <div className={styles.products}>
          {isProductsError && products.length === 0 ? (
            <EmptyState
              tone="danger"
              icon="bx-error-circle"
              title="No se pudieron cargar los productos"
              description={productsError?.message}
            />
          ) : (
            <ProductGrid
              products={productsToDisplay}
              onAddToCart={addToCart}
              activeStoreId={effectiveStoreId}
              loading={isLoadingProducts}
              empty={
                hasFilters ? (
                  <EmptyState
                    icon="bx-search-alt"
                    title="Sin resultados"
                    description={
                      searchTerm
                        ? 'No hay productos que coincidan con la búsqueda.'
                        : 'No se encontraron productos en esta categoría.'
                    }
                    action={
                      <Button variant="secondary" icon="bx-grid-alt" onClick={clearFilters}>
                        Ver todos
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon="bx-package"
                    title="Esta tienda no tiene productos a la venta"
                    description="Asigna productos o hazlos visibles en Gestión › Productos."
                  />
                )
              }
            />
          )}
        </div>
      </section>

      <aside className={styles.cartColumn}>
        <Cart activeStoreId={effectiveStoreId} />
      </aside>

      <ConfirmDialog
        isOpen={!!pendingStoreId}
        title="¿Cambiar de tienda?"
        message="Cambiar de tienda vaciará el pedido actual."
        confirmLabel="Cambiar y vaciar"
        tone="danger"
        icon="bx-store-alt"
        onConfirm={confirmStoreChange}
        onCancel={() => setPendingStoreId(null)}
      />
    </div>
  );
};