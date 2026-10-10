// src/features/pos/components/ProductGrid.tsx
import type { ProductWithDetails } from '../../../types';
import { ProductCard } from './ProductCard';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: ProductWithDetails[];
  // El precio lo resuelve ProductCard según la tienda activa
  onAddToCart: (product: ProductWithDetails, price: number) => void;
  activeStoreId: string | null;
}

export const ProductGrid = ({ products, onAddToCart, activeStoreId }: ProductGridProps) => {
  if (products.length === 0) {
    return <div className={styles.empty}>No se encontraron productos en esta categoría.</div>;
  }

  return (
    <div className={styles.grid}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} activeStoreId={activeStoreId} />
      ))}
    </div>
  );
};