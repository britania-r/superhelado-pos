// src/features/sales/SaleDetailPage.tsx

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSaleDetails } from '../../api/sales.api';
import { formatCurrency } from '../../lib/formatters';
import { getPaymentMethodIcon } from '../../lib/paymentMethods';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Thumbnail } from '../../components/ui/Thumbnail';
import styles from './SaleDetailPage.module.css';

const formatDateTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });

export const SaleDetailPage = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();

  const { data: sale, isLoading, error, refetch } = useQuery({
    queryKey: ['sale-detail', saleId],
    queryFn: () => getSaleDetails(saleId!),
    enabled: !!saleId,
  });

  const backButton = (
    <Button variant="ghost" size="sm" icon="bx-arrow-back" onClick={() => navigate('/sales')} className={styles.back}>
      Ventas
    </Button>
  );

  if (isLoading) {
    return (
      <div>
        {backButton}
        <div className={styles.loading}>
          <Spinner size="lg" label="" />
          <p>Cargando detalles de la venta…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {backButton}
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudo cargar la venta"
          description={(error as Error).message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  if (!sale) {
    return (
      <div>
        {backButton}
        <EmptyState
          icon="bx-receipt"
          title="Venta no encontrada"
          action={
            <Button variant="secondary" icon="bx-arrow-back" onClick={() => navigate('/sales')}>
              Volver a ventas
            </Button>
          }
        />
      </div>
    );
  }

  const items = sale.sale_items ?? [];
  const unitCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const methodName = sale.payment_methods?.name;

  return (
    <div>
      {backButton}

      <PageHeader title={`Venta #${sale.id.substring(0, 8)}`} subtitle={formatDateTime(sale.created_at)} />

      <div className={styles.layout}>
        {/* ── Productos ── */}
        <section className={styles.card} aria-labelledby="sale-items-title">
          <header className={styles.cardHeader}>
            <h2 id="sale-items-title" className={styles.cardTitle}>Productos vendidos</h2>
            {items.length > 0 && (
              <span className={styles.cardMeta}>{unitCount === 1 ? '1 unidad' : `${unitCount} unidades`}</span>
            )}
          </header>

          {items.length > 0 ? (
            <ul className={styles.items}>
              {items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <Thumbnail src={item.products?.image_url} alt="" size="sm" />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.products?.name || 'Producto desconocido'}</span>
                    <span className={styles.itemMeta}>
                      {item.quantity} × {formatCurrency(item.price_at_sale)}
                    </span>
                  </div>
                  <span className={styles.itemTotal}>{formatCurrency(item.quantity * item.price_at_sale)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noItems}>No hay productos registrados para esta venta.</p>
          )}

          <footer className={styles.totalRow}>
            <span>Total</span>
            <span className={styles.totalAmount}>{formatCurrency(sale.total_amount)}</span>
          </footer>
        </section>

        {/* ── Datos de la venta y pago ── */}
        <section className={styles.card} aria-labelledby="sale-info-title">
          <header className={styles.cardHeader}>
            <h2 id="sale-info-title" className={styles.cardTitle}>Datos de la venta</h2>
          </header>
          <dl className={styles.info}>
            <div className={styles.infoRow}>
              <dt>Tienda</dt>
              <dd>{sale.stores?.name || 'N/A'}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Vendedor</dt>
              <dd>{sale.profiles?.full_name || 'N/A'}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Método de pago</dt>
              <dd>
                {methodName ? <Badge icon={getPaymentMethodIcon(methodName)}>{methodName}</Badge> : 'N/A'}
              </dd>
            </div>
          </dl>

          <dl className={styles.payment}>
            <div className={styles.infoRow}>
              <dt>Total de la venta</dt>
              <dd className={styles.money}>{formatCurrency(sale.total_amount)}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Pagó con</dt>
              <dd className={styles.money}>{formatCurrency(sale.paid_amount)}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>Cambio</dt>
              <dd className={styles.money}>{formatCurrency(sale.change_amount)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
};