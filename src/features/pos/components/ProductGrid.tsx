// src/features/pos/components/ProductGrid.tsx

import { useMemo, type ReactNode } from 'react';
import type { ProductWithDetails } from '../../../types';
import { useCartStore } from '../../../store/cartStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: ProductWithDetails[];
  // El precio lo resuelve ProductCard según la tienda activa
  onAddToCart: (product: ProductWithDetails, price: number) => void;
  activeStoreId: string | null;
  loading?: boolean;
  /** Qué mostrar si no hay productos (por defecto, un aviso genérico) */
  empty?: ReactNode;
}

const SKELETON_CARDS = 10;

export const ProductGrid = ({ products, onAddToCart, activeStoreId, loading = false, empty }: ProductGridProps) => {
  // Cantidades del pedido para la burbuja de cada tarjeta (solo visual)
  const cartItems = useCartStore((state) => state.items);
  const quantities = useMemo(
    () => new Map(cartItems.map((item) => [item.id, item.quantity])),
    [cartItems]
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.grid} aria-busy="true" aria-label="Cargando productos">
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <div key={index} className={styles.skeletonCard} aria-hidden="true">
              <span className={styles.skeletonImage} />
              <span className={styles.skeletonLine} />
              <span className={styles.skeletonPrice} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <>
        {empty ?? (
          <EmptyState
            icon="bx-search-alt"
            title="Sin productos"
            description="No se encontraron productos en esta categoría."
          />
        )}
      </>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            activeStoreId={activeStoreId}
            quantity={quantities.get(product.id) ?? 0}
          />
        ))}
      </div>
    </div>
  );
};