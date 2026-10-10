// src/features/sales/SaleDetailPage.tsx

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSaleDetails } from '../../api/sales.api';
import { formatCurrency } from '../../lib/formatters';
import styles from './SaleDetailPage.module.css';

export const SaleDetailPage = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ['sale-detail', saleId],
    queryFn: () => getSaleDetails(saleId!),
    enabled: !!saleId,
  });

  if (isLoading) return <div className={styles.loadingState}>Cargando detalles de la venta...</div>;
  if (error) return <div className={styles.errorState}>Error: {(error as Error).message}</div>;
  if (!sale) return <div className={styles.emptyState}>Venta no encontrada.</div>;

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/sales')} className={styles.backButton}>
        <i className='bx bx-arrow-back'></i> Volver a Ventas
      </button>

      <div className={styles.header}>
        <h1>Detalles de Venta #{sale.id.substring(0, 8)}...</h1>
      </div>

      <div className={styles.saleSummary}>
        <p><strong>Fecha y Hora:</strong> {new Date(sale.created_at).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
        <p><strong>Tienda:</strong> {sale.stores?.name || 'N/A'}</p>
        <p><strong>Vendedor:</strong> {sale.profiles?.full_name || 'N/A'}</p>
        <p><strong>Método de Pago:</strong> {sale.payment_methods?.name || 'N/A'}</p>
        <p><strong>Total de la Venta:</strong> {formatCurrency(sale.total_amount)}</p>
        <p><strong>Pago Con:</strong> {formatCurrency(sale.paid_amount)}</p>
        <p><strong>Cambio:</strong> {formatCurrency(sale.change_amount)}</p>
      </div>

      <h2>Productos Vendidos</h2>
      {sale.sale_items && sale.sale_items.length > 0 ? (
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th style={{ width: '50px' }}></th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.sale_items.map(item => (
              <tr key={item.id}>
                <td>
                  {item.products?.image_url ? (
                    <img src={item.products.image_url} alt={item.products.name || 'Producto'} className={styles.itemImage} />
                  ) : (
                    <div className={styles.itemImagePlaceholder}>
                      <i className='bx bx-image'></i>
                    </div>
                  )}
                </td>
                <td>{item.products?.name || 'Producto Desconocido'}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.price_at_sale)}</td>
                <td>{formatCurrency(item.quantity * item.price_at_sale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.noItems}>No hay productos registrados para esta venta.</p>
      )}
    </div>
  );
};