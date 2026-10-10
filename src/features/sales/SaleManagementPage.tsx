// src/features/sales/SaleManagementPage.tsx

import { useState } from 'react';
import { useStores, useSales } from '../../hooks/queries';
import { formatCurrency } from '../../lib/formatters';
import styles from './SaleManagementPage.module.css';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { SalesSummaryModal } from './SalesSummaryModal';
import { ExportSalesModal } from './ExportSalesModal';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const ROWS_PER_PAGE_OPTIONS = [10, 20, 30, 40, 50];

export const SaleManagementPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Filtros "aplicados" — solo cambian al hacer clic en Aplicar Filtros
  const [appliedDate, setAppliedDate] = useState(getTodayDateString());
  const [appliedStoreId, setAppliedStoreId] = useState<string | null>(null);

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const navigate = useNavigate();
  const { profile } = useUserStore();

  const { data: stores = [] } = useStores();
  const storeFilter = profile?.role === 'vendedor' ? profile.store_id : appliedStoreId;
  const { data: allSales = [], isLoading, error } = useSales(appliedDate, storeFilter);

  const handleApplyFilters = () => {
    setAppliedDate(selectedDate);
    setAppliedStoreId(selectedStoreId);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(allSales.length / salesPerPage);
  const currentSales = allSales.slice((currentPage - 1) * salesPerPage, currentPage * salesPerPage);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Historial de Ventas</h1>
        <div className={styles.controls}>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          {profile?.role === 'admin' && (
            <select
              className={styles.selectInput}
              value={selectedStoreId ?? ''}
              onChange={e => setSelectedStoreId(e.target.value === '' ? null : e.target.value)}
            >
              <option value="">Todas las Tiendas</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <select
            className={styles.selectInput}
            value={salesPerPage}
            onChange={e => { setSalesPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
          >
            {ROWS_PER_PAGE_OPTIONS.map(o => <option key={o} value={o}>{o} filas</option>)}
          </select>
          <button onClick={handleApplyFilters} className={styles.fetchButton} disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Aplicar Filtros'}
          </button>
          <button onClick={() => setIsSummaryOpen(true)} className={styles.summaryButton}>
            Resumen Diario
          </button>
          {profile?.role === 'admin' && (
            <button onClick={() => setIsExportOpen(true)} className={styles.exportButton}>
              Exportar Ventas
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className={styles.loadingState}>Cargando ventas...</p>
      ) : error ? (
        <p className={styles.errorState}>Error: {(error as Error).message}</p>
      ) : currentSales.length === 0 ? (
        <p className={styles.emptyState}>No hay ventas para los filtros seleccionados.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID Venta</th>
              <th>Fecha y Hora</th>
              <th>Tienda</th>
              <th>Vendedor</th>
              <th>Método de Pago</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentSales.map(sale => (
              <tr key={sale.id}>
                <td>{sale.id.slice(0, 8)}…</td>
                <td>
                  {new Date(sale.created_at).toLocaleString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  })}
                </td>
                <td>{sale.stores?.name ?? 'N/A'}</td>
                <td>{sale.profiles?.full_name ?? 'N/A'}</td>
                <td>{sale.payment_methods?.name ?? 'N/A'}</td>
                <td>{formatCurrency(sale.total_amount)}</td>
                <td>
                  <button onClick={() => navigate(`/sales/${sale.id}`)} className={styles.actionButton}>
                    <i className="bx bx-search" /> Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && !isLoading && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >‹</button>
          <span>Página {currentPage} de {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >›</button>
        </div>
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