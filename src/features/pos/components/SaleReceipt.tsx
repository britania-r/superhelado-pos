// src/features/pos/components/SaleReceipt.tsx
import { forwardRef } from 'react';
import { formatCurrency } from '../../../lib/formatters';
import styles from './SaleReceipt.module.css';

export interface SaleReceiptProps {
  saleDetails: {
    items: { product: { name: string }; quantity: number; }[];
    totalAmount: number;
    paidAmount: number;
    changeAmount: number;
    paymentMethodName: string;
    storeName: string;
  };
}

/* forwardRef es imprescindible para react‑to‑print */
export const SaleReceipt = forwardRef<HTMLDivElement, SaleReceiptProps>(
  ({ saleDetails }, ref) => (
    <div ref={ref} className={styles.ticket}>
      <h3 className={styles.center}>{saleDetails.storeName}</h3>
      <hr />
      {saleDetails.items.map((i, idx) => (
        <div key={idx} className={styles.row}>
          <span>{i.quantity} × {i.product.name}</span>
        </div>
      ))}
      <hr />
      <div className={styles.row}>
        <strong>Total:</strong>
        <strong>{formatCurrency(saleDetails.totalAmount)}</strong>
      </div>
      <div className={styles.row}>
        <span>Pago:</span>
        <span>{formatCurrency(saleDetails.paidAmount)}</span>
      </div>
      <div className={styles.row}>
        <span>Cambio:</span>
        <span>{formatCurrency(saleDetails.changeAmount)}</span>
      </div>
      <div className={styles.center}>{saleDetails.paymentMethodName}</div>
      <hr />
      <div className={styles.center}>¡Gracias por su compra!</div>
    </div>
));
