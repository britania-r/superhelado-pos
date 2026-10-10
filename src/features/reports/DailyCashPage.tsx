// FILE: src/features/reports/DailyCashPage.tsx
// DESC: Reemplaza todo el contenido de este archivo.

import { useState, useEffect, useCallback } from 'react';
// --- CAMBIO: Importar la nueva función v3 ---
import { v3_getDailyCashSummary } from '../../api/reports.api';
import { getStores } from '../../api/stores.api';
import { getOpenCashShift } from '../../api/shifts.api';
// --- CAMBIO: Usar el nuevo tipo de resultado v3 ---
import type { V3DailyCashSummaryResult, Store, CashShift } from '../../types';
import { formatCurrency } from '../../lib/formatters';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { Modal } from '../../components/ui/Modal';
import { OpenCashShiftModal } from '../pos/components/OpenCashShiftModal';
import { CloseCashShiftModal } from '../pos/components/CloseCashShiftModal';
import styles from './DailyCashPage.module.css';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToDDMMYYYY = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

export const DailyCashPage = () => {
  const { profile, user } = useUserStore();
  const [reportData, setReportData] = useState<V3DailyCashSummaryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | null>(null);
  const [currentShift, setCurrentShift] = useState<CashShift | null>(null);
  const [isOpeningShift, setIsOpeningShift] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const storeList = await getStores();
        setStores(storeList);
        if (profile?.role === 'vendedor' && profile.store_id) {
          setSelectedStoreFilter(profile.store_id);
        }
      } catch (err: any) {
        toast.error(`Error cargando tiendas: ${err.message}`);
      }
    };
    loadStores();
  }, [profile]);

  const fetchReport = useCallback(async () => {
    if (!selectedDate) {
      toast.error("Selecciona una fecha para el reporte.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setReportData([]);
    setHasGeneratedReport(true);

    try {
      let storeFilterId = selectedStoreFilter;
      if (profile?.role === 'vendedor' && profile.store_id) {
        storeFilterId = profile.store_id;
      }
      
      // --- CAMBIO: Llamar a la función v3 ---
      const data = await v3_getDailyCashSummary(selectedDate, storeFilterId);
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error al cargar el reporte: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedStoreFilter, profile]);

  const loadDailyCashData = useCallback(async () => {
    if (!user || !profile) return;
    const storeIdToCheck = profile.role === 'vendedor' ? profile.store_id : selectedStoreFilter;
    if (storeIdToCheck) {
      try {
        const openShift = await getOpenCashShift(user.id, storeIdToCheck);
        setCurrentShift(openShift);
      } catch {
        setCurrentShift(null);
      }
    } else {
      setCurrentShift(null);
    }
  }, [user, selectedStoreFilter, profile]);

  useEffect(() => {
    loadDailyCashData();
  }, [loadDailyCashData]);

  const handleShiftOpened = (shift: CashShift) => {
    setCurrentShift(shift);
    setIsOpeningShift(false);
    toast.success("Caja abierta con éxito!");
    fetchReport();
  };

  const handleShiftClosed = () => {
    setCurrentShift(null);
    setIsClosingShift(false);
    toast.success("Caja cerrada con éxito!");
    fetchReport();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Caja Diaria</h1>
        <div className={styles.controls}>
          <input type="date" className={styles.dateInput} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          {profile?.role === 'admin' && (
            <select className={styles.selectInput} value={selectedStoreFilter ?? ''} onChange={(e) => setSelectedStoreFilter(e.target.value === '' ? null : e.target.value)}>
              <option value="">Todas las Tiendas</option>
              {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          )}
          <button onClick={fetchReport} className={styles.fetchButton} disabled={isLoading}>
            {isLoading ? 'Cargando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      <div className={styles.reportContent}>
        {isLoading && <div className={styles.loadingState}>Generando reporte...</div>}
        {!isLoading && error && <div className={styles.errorState}>Error: {error}</div>}
        {!hasGeneratedReport && !isLoading && (
          <div className={styles.emptyState}><p>Selecciona los filtros y haz clic en "Generar Reporte" para ver los datos de caja.</p></div>
        )}
        {hasGeneratedReport && !isLoading && !error && reportData.length === 0 && (
          <div className={styles.emptyState}><p>No hay datos de caja para la fecha y filtros seleccionados.</p></div>
        )}

        {hasGeneratedReport && !isLoading && !error && reportData.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tienda</th>
                <th>Fecha</th>
                <th>Apertura</th>
                <th>Ventas</th>
                <th>Saldo Esperado</th>
                <th>Monto Contado</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map(row => (
                <tr key={row.store_id}> 
                  <td>{row.store_name}</td>
                  <td>{formatDateToDDMMYYYY(row.report_date)}</td>
                  <td>{formatCurrency(row.opening_balance)}</td>
                  <td>{formatCurrency(row.total_sales_day)}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(row.total_day_balance)}</td>
                  <td>{formatCurrency(row.total_counted)}</td>
                  <td style={{ color: row.total_difference < 0 ? 'var(--color-error)' : (row.total_difference > 0 ? 'var(--color-success)' : 'inherit'), fontWeight: 'bold' }}>
                    {formatCurrency(row.total_difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Botones y modales de caja */}
      {selectedStoreFilter && user && ( 
        <div className={styles.shiftActions}>
          {!currentShift ? (
            <button onClick={() => setIsOpeningShift(true)} className={styles.actionButton}>
              <i className='bx bx-log-in-circle'></i> Abrir Caja
            </button>
          ) : (
            <button onClick={() => setIsClosingShift(true)} className={styles.actionButton}>
              <i className='bx bx-log-out-circle'></i> Cerrar Caja
            </button>
          )}
        </div>
      )}
      <Modal isOpen={isOpeningShift} onClose={() => setIsOpeningShift(false)} title="Abrir Caja">
        <OpenCashShiftModal 
          userId={user!.id} 
          storeId={selectedStoreFilter!} 
          onShiftOpened={handleShiftOpened} 
          onClose={() => setIsOpeningShift(false)}
        />
      </Modal>
      <Modal isOpen={isClosingShift} onClose={() => setIsClosingShift(false)} title="Cerrar Caja">
        <CloseCashShiftModal 
          shift={currentShift!} 
          totalSales={reportData.find(r => r.store_id === currentShift?.store_id)?.total_sales_day ?? 0}
          onShiftClosed={handleShiftClosed} 
          onClose={() => setIsClosingShift(false)}
        />
      </Modal>
    </div>
  );
};