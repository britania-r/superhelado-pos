// src/features/sales/ExportSalesModal.tsx

import { useMemo, useState } from 'react';
import type { Store } from '../../types';
import toast from 'react-hot-toast';
import { getDetailedSalesForExport } from '../../api/reports.api';
import { getErrorMessage } from '../../lib/errors';
import { Modal } from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { DatePicker } from '../../components/ui/DatePicker';
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect';
import { Button } from '../../components/ui/Button';
import { FormActions } from '../../components/ui/FormActions';
import styles from './SalesSummaryModal.module.css';

// Fecha de hoy en formato YYYY-MM-DD
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convierte la lista a CSV y la descarga
const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) {
    toast.error('No hay datos para exportar en el rango seleccionado.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
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
  const blob = new Blob([`﻿${csvString}`], { type: 'text/csv;charset=utf-8;' });
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
  const today = getTodayDateString();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [storeId, setStoreId] = useState<string>(stores[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const storeOptions = useMemo<SelectOption[]>(
    () => stores.map((store) => ({ value: store.id, label: store.name, icon: 'bx-store-alt' })),
    [stores]
  );

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
    } catch (err) {
      toast.error(`Error al exportar: ${getErrorMessage(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Exportar ventas"
      description="Descarga las ventas del rango en un archivo CSV."
      size="sm"
    >
      <div className={styles.form}>
        <div className={styles.dates}>
          <Field label="Desde" htmlFor="export-start">
            <DatePicker value={startDate} onChange={setStartDate} max={endDate} label="Desde" />
          </Field>
          <Field label="Hasta" htmlFor="export-end">
            <DatePicker value={endDate} onChange={setEndDate} min={startDate} label="Hasta" />
          </Field>
        </div>

        <Field label="Tienda" htmlFor="export-store">
          <SearchableSelect
            options={storeOptions}
            value={storeId}
            onChange={(value) => setStoreId(value)}
            disabled={stores.length === 0}
            label="Tienda"
            placeholder="Selecciona una tienda"
            searchPlaceholder="Buscar tienda…"
            emptyMessage="No hay tiendas con ese nombre"
          />
        </Field>

        <FormActions>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="bx-download" loading={isLoading} onClick={handleExport}>
            Exportar
          </Button>
        </FormActions>
      </div>
    </Modal>
  );
};