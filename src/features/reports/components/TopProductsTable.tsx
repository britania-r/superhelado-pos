// src/features/reports/components/TopProductsTable.tsx

import type { ReportTopSoldProductsResult } from '../../../types';
import { formatCurrency } from '../../../lib/formatters';
import styles from './TopProductsTable.module.css';

interface TopProductsTableProps {
  data: ReportTopSoldProductsResult[];
  title: string;
}

export const TopProductsTable = ({ data, title }: TopProductsTableProps) => {
  if (!data || data.length === 0) return null;

  return (
    <div className={styles.tableContainer}>
      <h3 className={styles.tableTitle}>{title}</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Cantidad Vendida</th>
            <th>Total Ventas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.product_id}>
              <td>{index + 1}</td>
              <td>{item.product_name}</td>
              <td>{item.category_name}</td>
              <td>{item.total_quantity}</td>
              <td>{formatCurrency(item.total_sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};