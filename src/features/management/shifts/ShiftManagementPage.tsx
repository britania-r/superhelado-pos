// src/features/shifts/ShiftManagementPage.tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getCashShiftHistory } from '../../../api/shifts.api';
import type { CashShift } from '../../../types';
import { formatCurrency } from '../../../lib/formatters';
import styles from './ShiftManagementPage.module.css'; // CORRECTO: Ruta
import toast from 'react-hot-toast'; 
import { useUserStore } from '../../../store/userStore';

const SHIFTS_PER_PAGE = 10;

export const ShiftManagementPage = () => {
  const [allShifts, setAllShifts] = useState<CashShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { profile } = useUserStore();

  const formatDateTime = useCallback((isoString: string) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}/${month}/${year}, ${time}`;
  }, []);

  const fetchShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let data = await getCashShiftHistory();
      
      if (profile?.role === 'vendedor' && profile.store_id) {
        data = data.filter(shift => shift.store_id === profile.store_id);
      }
      
      setAllShifts(data);
      setCurrentPage(1);
    } catch (err: any) { // CORREGIDO: `err` es de tipo `any` en catch
      toast.error(`Error cargando historial de turnos: ${err.message}`);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const totalPages = useMemo(() => Math.ceil(allShifts.length / SHIFTS_PER_PAGE), [allShifts.length]);

  const currentShifts = useMemo(() => {
    const startIndex = (currentPage - 1) * SHIFTS_PER_PAGE;
    const endIndex = startIndex + SHIFTS_PER_PAGE;
    return allShifts.slice(startIndex, endIndex);
  }, [allShifts, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (isLoading) return <div className={styles.loadingState}>Cargando historial de turnos...</div>;
  if (error) return <div className={styles.errorState}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Historial de Turnos de Caja</h1>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className={styles.paginationButton}
            >
              <i className='bx bx-chevron-left'></i>
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
            >
              <i className='bx bx-chevron-right'></i>
            </button>
          </div>
        )}
      </div>

      {currentShifts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No hay turnos de caja registrados.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID Turno</th>
              <th>Tienda</th>
              <th>Vendedor</th>
              <th>Apertura</th>
              <th>Cierre</th>
              <th>Monto Apertura</th>
              <th>Ventas Calculadas</th>
              <th>Monto Cierre</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {currentShifts.map(shift => ( // CORREGIDO: `shift` es de tipo `CashShift`
              <tr key={shift.id}>
                <td>{shift.id}</td>
                <td>{shift.stores?.name || 'N/A'}</td>
                <td>{shift.profiles?.full_name || 'N/A'}</td>
                <td>{formatDateTime(shift.opened_at)}</td>
                <td>{shift.closed_at ? formatDateTime(shift.closed_at) : 'Abierto'}</td>
                <td>{formatCurrency(shift.opening_balance)}</td>
                <td>{shift.calculated_sales !== null ? formatCurrency(shift.calculated_sales) : 'N/A'}</td>
                <td>{shift.closing_balance !== null ? formatCurrency(shift.closing_balance) : 'N/A'}</td>
                <td>
                  {shift.closing_balance !== null && shift.calculated_sales !== null
                    ? formatCurrency(shift.closing_balance - (shift.opening_balance + shift.calculated_sales))
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};