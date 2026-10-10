// src/features/pos/PosPage.tsx

import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { useCategories, useStores, usePosProducts } from '../../hooks/queries';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import { ProductGrid } from './components/ProductGrid';
import { Cart } from './components/Cart';
import styles from './PosPage.module.css';

const statusTextStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  textAlign: 'center',
  color: 'var(--color-text-secondary)',
};

export const PosPage = () => {
  const { profile, user, isLoading: isProfileLoading } = useUserStore();

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

    if (
      cartItemCount > 0 &&
      !window.confirm('Cambiar de tienda vaciará el pedido actual. ¿Deseas continuar?')
    ) {
      return; // El <select> es controlado: vuelve solo a la tienda anterior
    }

    setCartStore(newStoreId);
  };

  if (isProfileLoading || isLoadingStores) return <div>Cargando Punto de Venta...</div>;

  if (!profile || (profile.role === 'vendedor' && !profile.store_id)) {
    return (
      <div className={styles.missingStoreError}>
        <p>No se puede cargar el Punto de Venta.</p>
        <p>Asegúrate de que tu usuario tenga una tienda asignada.</p>
      </div>
    );
  }

  if (!effectiveStoreId) {
    return (
      <div className={styles.missingStoreError}>
        <p>No hay tiendas disponibles.</p>
        <p>Crea al menos una tienda en "Gestión de Tiendas".</p>
      </div>
    );
  }

  return (
    <div className={styles.posPage}>
      <div className={styles.mainContent}>
        <div className={styles.topSection}>
          <header className={styles.header}>
            <h2>Productos</h2>
            {profile.role === 'admin' && (
              <select
                className={styles.storeSelector}
                value={effectiveStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            )}
            <input
              type="search"
              placeholder="Buscar producto..."
              className={styles.searchBar}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </header>

          <nav className={styles.categoryNav}>
            <button onClick={() => setActiveCategory(null)} className={activeCategory === null ? styles.active : ''}>
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={activeCategory === cat.id ? styles.active : ''}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.productGridContainer}>
          {isLoadingProducts ? (
            <p style={statusTextStyle}>Cargando productos...</p>
          ) : isProductsError && products.length === 0 ? (
            <p style={{ ...statusTextStyle, color: 'var(--color-error)' }}>
              No se pudieron cargar los productos{productsError ? `: ${productsError.message}` : ''}.
            </p>
          ) : (
            <ProductGrid products={productsToDisplay} onAddToCart={addToCart} activeStoreId={effectiveStoreId} />
          )}
        </div>
      </div>

      <aside className={styles.sidebar}>
        <Cart activeStoreId={effectiveStoreId} />
      </aside>
    </div>
  );
};