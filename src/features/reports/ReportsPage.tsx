// FILE: src/features/reports/ReportsPage.tsx
// DESC: Reemplaza todo el contenido de este archivo.

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './ReportsPage.module.css';
import {
  getDailySalesByStore,
  getDailySalesByPaymentMethod,
  v3_getDailySalesByProduct, // Asegurémonos de usar la última versión (v3)
} from '../../api/reports.api';
import type { Store } from '../../types';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { getStores } from '../../api/stores.api';
import { ChartBar } from './components/ChartBar';

// --- NUEVO: Helper para obtener la fecha de hoy en formato YYYY-MM-DD ---
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type ReportSubType = 'store' | 'product' | 'payment_method';

export const ReportsPage = () => {
  const { profile, isLoading: isProfileLoading } = useUserStore();
  const hasLoadedInitialData = useRef(false);

  /* filtros simplificados */
  const [reportSubType, setReportSubType] = useState<ReportSubType>('product');
  // --- CAMBIO: Usar el nuevo helper para la fecha inicial ---
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('');

  /* datos */
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStores = async () => {
      if (isProfileLoading || !profile) return;
      try {
        const list = await getStores();
        setStores(list);
        if (profile.role === 'vendedor' && profile.store_id) {
          setSelectedStoreFilter(profile.store_id);
        } else if (profile.role === 'admin' && list.length > 0 && !selectedStoreFilter) {
          setSelectedStoreFilter(list[0].id);
        }
      } catch (err: any) {
        toast.error(`Error cargando tiendas: ${err.message}`);
      }
    };
    loadStores();
  }, [isProfileLoading, profile, selectedStoreFilter]);

  const transformDataForChart = useCallback(
    (data: any[], labelKey: string, valueKey: string, datasetLabel: string) => ({
      labels: data.map((d) => d[labelKey]),
      datasets: [{
        label: datasetLabel,
        data: data.map((d) => d[valueKey]),
        backgroundColor: 'rgba(74, 144, 226, 0.6)',
        borderColor: 'rgba(74, 144, 226, 1)',
        borderWidth: 1,
      }],
    }), []
  );

  const fetchReportData = useCallback(async () => {
    if (!profile || !selectedStoreFilter) return;
      
    setIsLoading(true);
    setError(null);
    setReportData([]);

    try {
      const storeId = selectedStoreFilter;
      let data;
      switch (reportSubType) {
        case 'store':
          data = await getDailySalesByStore(selectedDate, storeId);
          break;
        case 'product':
          data = await v3_getDailySalesByProduct(selectedDate, storeId);
          break;
        case 'payment_method':
          data = await getDailySalesByPaymentMethod(selectedDate, storeId);
          break;
        default:
          data = [];
      }
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error al cargar el reporte: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [reportSubType, selectedDate, selectedStoreFilter, profile]);

  useEffect(() => {
    if (profile && selectedStoreFilter && !hasLoadedInitialData.current) {
      fetchReportData();
      hasLoadedInitialData.current = true;
    }
  }, [profile, selectedStoreFilter, fetchReportData]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Reportes de Venta Diaria</h1>
      </div>

      <div className={styles.controls}>
        <select
          className={styles.selectInput}
          value={reportSubType}
          onChange={(e) => setReportSubType(e.target.value as ReportSubType)}
        >
          <option value="product">Por Producto</option>
          <option value="store">Por Tienda</option>
          <option value="payment_method">Por Método de Pago</option>
        </select>

        {profile?.role === 'admin' && (
          <select
            className={styles.selectInput}
            value={selectedStoreFilter}
            onChange={(e) => setSelectedStoreFilter(e.target.value)}
            disabled={stores.length === 0}
          >
            {stores.map((st) => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
        )}

        <input
          type="date"
          className={styles.dateInput}
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />

        <button onClick={fetchReportData} className={styles.fetchButton} disabled={isLoading}>
          {isLoading ? 'Cargando...' : 'Generar Reporte'}
        </button>
      </div>

      <div className={styles.reportContent}>
        {error && <div className={styles.errorState}>{error}</div>}
        {isLoading && <div className={styles.loadingState}>Generando reporte…</div>}

        {!isLoading && !error && reportData.length > 0 && (
          <>
            {reportSubType === 'store' && (
              <ChartBar
                data={transformDataForChart(reportData, 'store_name', 'total_sales', 'Ventas por Tienda')}
                title="Ventas por Tienda"
              />
            )}
            
            {reportSubType === 'product' && (
              <ChartBar
                data={transformDataForChart(reportData, 'product_name', 'total_sales', 'Ventas por Producto')}
                title="Ventas por Producto"
              />
            )}

            {reportSubType === 'payment_method' && (
              <ChartBar
                data={transformDataForChart(reportData, 'payment_method_name', 'total_sales', 'Ventas por Método de Pago')}
                title="Ventas por Método de Pago"
              />
            )}
          </>
        )}

        {!isLoading && !error && reportData.length === 0 && (
          <div className={styles.emptyState}>
            <p>No hay datos para el reporte seleccionado.</p>
            <p>Ajusta los filtros y haz clic en "Generar Reporte".</p>
          </div>
        )}
      </div>
    </div>
  );
};