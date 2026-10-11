// src/features/sales/SaleManagementPage.tsx

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStores, useSales } from '../../hooks/queries';
import type { Sale } from '../../types';
import { formatCurrency } from '../../lib/formatters';
import { getPaymentMethodIcon } from '../../lib/paymentMethods';
import { useUserStore } from '../../store/userStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCard } from '../../components/ui/StatCard';
import { DatePicker } from '../../components/ui/DatePicker';
import { Pagination } from '../../components/ui/Pagination';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect';
import { SalesSummaryModal } from './SalesSummaryModal';
import { ExportSalesModal } from './ExportSalesModal';
import styles from './SaleManagementPage.module.css';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const ROWS_PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];

/* Valor de "Todas las tiendas" en el selector (los ids de tienda son UUID) */
const ALL_STORES = 'all';

const ROWS_OPTIONS: SelectOption[] = ROWS_PER_PAGE_OPTIONS.map((rows) => ({
  value: String(rows),
  label: `${rows} por página`,
}));

/* "Domingo, 11 de octubre" a partir de "2026-10-11" (sin zona horaria) */
const formatLongDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

export const SaleManagementPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Filtros "aplicados" — solo cambian al hacer clic en Aplicar filtros
  const [appliedDate, setAppliedDate] = useState(getTodayDateString());
  const [appliedStoreId, setAppliedStoreId] = useState<string | null>(null);

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const navigate = useNavigate();
  const { profile } = useUserStore();
  const isAdmin = profile?.role === 'admin';

  const { data: stores = [] } = useStores();
  const storeFilter = profile?.role === 'vendedor' ? profile.store_id : appliedStoreId;
  const { data: allSales = [], isLoading, error, refetch } = useSales(appliedDate, storeFilter);

  const handleApplyFilters = () => {
    setAppliedDate(selectedDate);
    setAppliedStoreId(selectedStoreId);
    setCurrentPage(1);
  };

  const hasPendingFilters = selectedDate !== appliedDate || selectedStoreId !== appliedStoreId;

  const totalPages = Math.ceil(allSales.length / salesPerPage);
  const currentSales = allSales.slice((currentPage - 1) * salesPerPage, currentPage * salesPerPage);

  const storeOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_STORES, label: 'Todas las tiendas', icon: 'bx-buildings' },
      ...stores.map((store) => ({ value: store.id, label: store.name, icon: 'bx-store-alt' })),
    ],
    [stores]
  );

  /* Resumen de lo que se ve (filtros aplicados) */
  const summary = useMemo(() => {
    const total = allSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const byMethod = new Map<string, number>();
    allSales.forEach((sale) => {
      const name = sale.payment_methods?.name ?? 'Sin método';
      byMethod.set(name, (byMethod.get(name) ?? 0) + Number(sale.total_amount));
    });
    return {
      total,
      count: allSales.length,
      average: allSales.length > 0 ? total / allSales.length : 0,
      methods: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [allSales]);

  const columns = useMemo<DataTableColumn<Sale>[]>(
    () => [
      {
        key: 'id',
        header: 'Venta',
        render: (sale) => (
          <button type="button" className={styles.saleId} onClick={() => navigate(`/sales/${sale.id}`)}>
            #{sale.id.slice(0, 8)}
          </button>
        ),
      },
      { key: 'time', header: 'Hora', muted: true, mobile: 'subtitle', render: (sale) => formatTime(sale.created_at) },
      { key: 'store', header: 'Tienda', fallback: 'N/A', render: (sale) => sale.stores?.name },
      { key: 'seller', header: 'Vendedor', fallback: 'N/A', render: (sale) => sale.profiles?.full_name },
      {
        key: 'method',
        header: 'Método de pago',
        render: (sale) =>
          sale.payment_methods?.name ? (
            <Badge icon={getPaymentMethodIcon(sale.payment_methods.name)}>{sale.payment_methods.name}</Badge>
          ) : (
            <span className={styles.muted}>N/A</span>
          ),
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        strong: true,
        mobile: 'title',
        render: (sale) => <span className={styles.amount}>{formatCurrency(sale.total_amount)}</span>,
      },
    ],
    [navigate]
  );

  return (
    <div>
      <PageHeader
        title="Ventas"
        subtitle={formatLongDate(appliedDate)}
        actions={
          <>
            <Button variant="secondary" icon="bx-printer" onClick={() => setIsSummaryOpen(true)} iconOnlyOnMobile>
              Resumen diario
            </Button>
            {isAdmin && (
              <Button variant="secondary" icon="bx-download" onClick={() => setIsExportOpen(true)} iconOnlyOnMobile>
                Exportar
              </Button>
            )}
          </>
        }
      />

      {/* ── Filtros ── */}
      <div className={styles.toolbar}>
        <DatePicker value={selectedDate} onChange={setSelectedDate} label="Fecha" className={styles.date} />
        {isAdmin && (
          <SearchableSelect
            options={storeOptions}
            value={selectedStoreId ?? ALL_STORES}
            onChange={(value) => setSelectedStoreId(value === ALL_STORES ? null : value)}
            label="Tienda"
            searchPlaceholder="Buscar tienda…"
            emptyMessage="No hay tiendas con ese nombre"
            className={styles.store}
          />
        )}
        <Button
          variant={hasPendingFilters ? 'primary' : 'secondary'}
          icon="bx-filter-alt"
          onClick={handleApplyFilters}
          loading={isLoading}
          className={styles.apply}
        >
          Aplicar filtros
        </Button>
      </div>

      {/* ── Resumen ── */}
      {!isLoading && !error && allSales.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.stats}>
            <StatCard label="Total vendido" value={formatCurrency(summary.total)} icon="bx-money" tone="brand" emphasis />
            <StatCard label="Ventas" value={summary.count} icon="bx-receipt" tone="accent" />
            <StatCard label="Ticket promedio" value={formatCurrency(summary.average)} icon="bx-bar-chart-alt-2" tone="neutral" />
          </div>
          <ul className={styles.methods} aria-label="Total por método de pago">
            {summary.methods.map(([name, amount]) => (
              <li key={name} className={styles.method}>
                <i className={`bx ${getPaymentMethodIcon(name)}`} aria-hidden="true" />
                <span className={styles.methodName}>{name}</span>
                <span className={styles.methodAmount}>{formatCurrency(amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Lista ── */}
      {error ? (
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudieron cargar las ventas"
          description={(error as Error).message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            caption="Ventas"
            columns={columns}
            rows={currentSales}
            rowKey={(sale) => sale.id}
            loading={isLoading}
            skeletonRows={6}
            actions={(sale) => (
              <IconButton
                icon="bx-show"
                label={`Ver detalle de la venta ${sale.id.slice(0, 8)}`}
                tooltip="Ver detalle"
                variant="brand"
                size="sm"
                onClick={() => navigate(`/sales/${sale.id}`)}
              />
            )}
            empty={
              <EmptyState
                icon="bx-receipt"
                title="Sin ventas"
                description="No hay ventas para los filtros seleccionados."
              />
            }
          />

          {!isLoading && allSales.length > ROWS_PER_PAGE_OPTIONS[0] && (
            <div className={styles.footer}>
              <SearchableSelect
                options={ROWS_OPTIONS}
                value={String(salesPerPage)}
                onChange={(value) => { setSalesPerPage(parseInt(value)); setCurrentPage(1); }}
                searchable={false}
                label="Filas por página"
                className={styles.rows}
              />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages))}
                totalItems={allSales.length}
                pageSize={salesPerPage}
                className={styles.pagination}
              />
            </div>
          )}
        </>
      )}

      {isSummaryOpen && (
        <SalesSummaryModal
          stores={stores}
          defaultStoreId={profile?.store_id ?? null}
          role={profile?.role ?? 'vendedor'}
          onClose={() => setIsSummaryOpen(false)}
        />
      )}
      {isExportOpen && (
        <ExportSalesModal stores={stores} onClose={() => setIsExportOpen(false)} />
      )}
    </div>
  );
};