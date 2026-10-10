// FILE: src/features/pos/components/ProductCard.tsx
// DESC: Reemplaza todo el contenido de este archivo.

import type { ProductWithDetails } from '../../../types';
import { formatCurrency } from '../../../lib/formatters';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: ProductWithDetails;
  onAddToCart: (product: ProductWithDetails, price: number) => void;
  activeStoreId: string | null;
}

export const ProductCard = ({ product, onAddToCart, activeStoreId }: ProductCardProps) => {
  const priceToShow = product.store_products.find(sp => sp.store_id === activeStoreId)?.price; 

  if (priceToShow === undefined || priceToShow === null) {
    return null;
  }

  return (
    <div className={styles.card} onClick={() => onAddToCart(product, priceToShow)}>
      {/* --- CAMBIO: Renderizado condicional de la imagen --- */}
      {product.image_url ? (
        // Si hay URL, muestra la imagen
        <img src={product.image_url} alt={product.name} className={styles.image} />
      ) : (
        // Si NO hay URL, muestra un placeholder con un icono
        <div className={styles.imagePlaceholder}>
          <i className='bx bxs-package'></i>
        </div>
      )}
      <div className={styles.info}>
        <h4 className={styles.name}>{product.name}</h4>
        <p className={styles.price}>{formatCurrency(priceToShow)}</p>
      </div>
    </div>
  );
};