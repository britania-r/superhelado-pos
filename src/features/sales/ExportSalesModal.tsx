// FILE: src/features/sales/ExportSalesModal.tsx
// DESC: Reemplaza todo el contenido de este archivo.

import { useState } from 'react';
import type { Store } from '../../types';
import toast from 'react-hot-toast';
import { getDetailedSalesForExport } from '../../api/reports.api';
import styles from './SalesSummaryModal.module.css'; 

// --- NUEVO: Helper para obtener la fecha de hoy en formato YYYY-MM-DD ---
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Función helper para convertir JSON a CSV y descargar
const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    toast.error('No hay datos para exportar en el rango seleccionado.');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        let stringValue = String(value);
        if (stringValue.search(/("|,|\n)/g) >= 0) {
          stringValue = `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];
  
  const csvString = csvRows.join('\r\n');
  const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success('¡Exportación completada!');
};


interface Props {
  stores: Store[];
  onClose: () => void;
}

export const ExportSalesModal = ({ stores, onClose }: Props) => {
  // --- CAMBIO: Usar el nuevo helper para la fecha inicial ---
  const today = getTodayDateString();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [storeId, setStoreId] = useState<string>(stores[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (!storeId) {
      toast.error('Por favor, selecciona una tienda.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Por favor, selecciona un rango de fechas.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    setIsLoading(true);
    try {
      const dataToExport = await getDetailedSalesForExport(startDate, endDate, storeId);
      const storeName = stores.find(s => s.id === storeId)?.name.replace(/\s+/g, '_') ?? 'tienda';
      const filename = `Ventas_${storeName}_${startDate}_a_${endDate}.csv`;
      
      downloadCSV(dataToExport, filename);
      onClose();
    } catch (err: any) {
      toast.error(`Error al exportar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>Exportar Ventas a CSV</h3>
        <button onClick={onClose} className={styles.closeButton}><i className='bx bx-x'></i></button>

        <div className={styles.formGroup}>
          <label>Fecha de Inicio:</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className={styles.input} 
          />
        </div>

        <div className={styles.formGroup}>
          <label>Fecha de Fin:</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className={styles.input} 
          />
        </div>
        
        <div className={styles.formGroup}>
          <label>Tienda:</label>
          <select 
            value={storeId} 
            onChange={e => setStoreId(e.target.value)} 
            className={styles.selectInput}
            disabled={stores.length === 0}
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className={styles.btnRow}>
          <button onClick={handleExport} disabled={isLoading} className={styles.submitButton}>
            {isLoading ? 'Exportando...' : 'Exportar'}
          </button>
          <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};