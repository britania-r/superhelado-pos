// src/features/sales/SalesSummaryReceipt.tsx

import { forwardRef } from 'react';
import type { ReportTopSoldProductsResult } from '../../types'; // Tipo de los items del reporte
import { formatCurrency } from '../../lib/formatters';
import styles from './SalesSummaryReceipt.module.css'; // Crear este CSS para el ticket

interface Props {
  date: string;
  storeName: string;
  items: ReportTopSoldProductsResult[]; // Items del reporte
}

export const SalesSummaryReceipt = forwardRef<HTMLDivElement, Props>(
  ({ date, storeName, items }, ref) => {
    // Calculamos el total de ventas sumando el 'total_sales' de cada producto
    const totalSales = items.reduce((acc, it) => acc + it.total_sales, 0);

    return (
      <div ref={ref} className={styles.ticket}>
        <h3 className={styles.center}>RESUMEN DE VENTAS DIARIO</h3>
        <p className={styles.center}>{storeName}</p>
        <p className={styles.center}>Fecha: {new Date(date).toLocaleDateString('es-PE')}</p>
        <p className={styles.separator}>-----------------------------------</p>

        <div className={styles.itemRowHeader}>
          <span className={styles.colProd}>PRODUCTO</span>
          <span className={styles.colQty}>CANT</span>
          <span className={styles.colSales}>TOTAL</span>
        </div>
        {items.map((it) => (
          <div className={styles.itemRow} key={it.product_id}>
            <span className={styles.colProd}>{it.product_name}</span>
            <span className={styles.colQty}>{it.total_quantity}</span>
            <span className={styles.colSales}>{formatCurrency(it.total_sales)}</span>
          </div>
        ))}
        <p className={styles.separator}>-----------------------------------</p>
        
        <div className={styles.totalRow}>
          <span>TOTAL VENTAS:</span>
          <span>{formatCurrency(totalSales)}</span>
        </div>
        
        <p className={styles.separator}>-----------------------------------</p>
        <p className={styles.center}>¡Gracias!</p>
      </div>
    );
  }
);