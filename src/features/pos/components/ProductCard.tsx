// src/features/pos/components/ProductCard.tsx

import type { ProductWithDetails } from '../../../types';
import { formatCurrency } from '../../../lib/formatters';
import { cx } from '../../../lib/cx';
import { Thumbnail } from '../../../components/ui/Thumbnail';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: ProductWithDetails;
  onAddToCart: (product: ProductWithDetails, price: number) => void;
  activeStoreId: string | null;
  /** Cuántos hay en el pedido (solo para mostrarlo) */
  quantity?: number;
}

export const ProductCard = ({ product, onAddToCart, activeStoreId, quantity = 0 }: ProductCardProps) => {
  const priceToShow = product.store_products.find(sp => sp.store_id === activeStoreId)?.price;

  if (priceToShow === undefined || priceToShow === null) {
    return null;
  }

  return (
    <button
      type="button"
      className={cx(styles.card, quantity > 0 && styles.inCart)}
      onClick={() => onAddToCart(product, priceToShow)}
      aria-label={`Agregar ${product.name}, ${formatCurrency(priceToShow)}${quantity > 0 ? `. En el pedido: ${quantity}` : ''}`}
    >
      <span className={styles.media}>
        <Thumbnail src={product.image_url} alt="" size="fill" className={styles.image} />
        {/* key: la burbuja "salta" cada vez que cambia la cantidad */}
        {quantity > 0 && (
          <span key={quantity} className={styles.quantity} aria-hidden="true">
            {quantity}
          </span>
        )}
        <span className={styles.add} aria-hidden="true">
          <i className="bx bx-plus" />
        </span>
      </span>
      <span className={styles.name}>{product.name}</span>
      <span className={styles.price}>{formatCurrency(priceToShow)}</span>
    </button>
  );
};