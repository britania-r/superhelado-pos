// src/features/sales/SalesSummaryModal.tsx
// Genera un resumen diario de ventas con desglose por método de pago y lo imprime.

import { useState, useEffect, useMemo } from 'react';
import { v2_getDailySalesByProduct, v2_getDailySalesByPaymentMethod } from '../../api/reports.api';
import type { V2ReportSalesByProductResult, V2ReportSalesByPaymentMethodResult, Store } from '../../types';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/formatters';
import { getErrorMessage } from '../../lib/errors';
import { Modal } from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { DatePicker } from '../../components/ui/DatePicker';
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect';
import { Button } from '../../components/ui/Button';
import { FormActions } from '../../components/ui/FormActions';
import { Alert } from '../../components/ui/Alert';
import styles from './SalesSummaryModal.module.css';

// Fecha de hoy en formato YYYY-MM-DD
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface Props {
  stores: Store[];
  defaultStoreId: string | null;
  role: 'admin' | 'vendedor';
  onClose: () => void;
}

export const SalesSummaryModal = ({
  stores,
  defaultStoreId,
  role,
  onClose,
}: Props) => {
  const [date, setDate] = useState(getTodayDateString());
  const [storeId, setStoreId] = useState<string | null>(
    role === 'vendedor' ? defaultStoreId : stores[0]?.id ?? null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receiptDetails, setReceiptDetails] = useState<{
    date: string;
    storeName: string;
    items: V2ReportSalesByProductResult[];
    paymentSummary: V2ReportSalesByPaymentMethodResult[];
  } | null>(null);

  const storeOptions = useMemo<SelectOption[]>(
    () => stores.map((store) => ({ value: store.id, label: store.name, icon: 'bx-store-alt' })),
    [stores]
  );

  useEffect(() => {
    if (!receiptDetails) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date(`${receiptDetails.date}T00:00:00`).toLocaleDateString(
      'es-PE', { timeZone: 'America/Lima' }
    );
    const formattedTime = new Date().toLocaleTimeString('es-PE', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const totalAmount = receiptDetails.items.reduce(
      (acc, it) => acc + Number(it.total_sales), 0
    );

    const ticketHTML = `
      <div class="ticket">
        <h3 class="center ticket-title">RESUMEN DE VENTAS DIARIO</h3>
        <p class="center">${receiptDetails.storeName}</p>
        <p class="center">Fecha: ${formattedDate} ${formattedTime}</p>
        <p class="separator">--------------------------------</p>
        <div class="item-row-header">
          <span class="col-prod">PRODUCTO</span>
          <span class="col-qty">CANT</span>
          <span class="col-total">TOTAL</span>
        </div>
        ${receiptDetails.items
          .map(item => `
            <div class="item-row" key="${item.product_id}">
              <span class="col-prod">${item.product_name}</span>
              <span class="col-qty">${item.total_quantity}</span>
              <span class="col-total">${formatCurrency(item.total_sales)}</span>
            </div>`
          ).join('')}

        <p class="separator">--------------------------------</p>
        ${receiptDetails.paymentSummary
          .map(payment => `
            <div class="summary-row" key="${payment.payment_method_name}">
              <span>${payment.payment_method_name.toUpperCase()}:</span>
              <span>${formatCurrency(payment.total_sales)}</span>
            </div>`
          ).join('')}

        <p class="separator">--------------------------------</p>
        <div class="total-row">
          <span>TOTAL VENTAS:</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
        <p class="separator">--------------------------------</p>
        <p class="center">POS Super Helado</p>
      </div>
    `;

    const fullDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Resumen de Ventas</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
            @page { size: 80mm auto; margin: 0; }
            @media print { body { margin: 0; } }
            body { margin: 0; padding: 0; font-family: 'Roboto Mono', monospace; font-size: 10px; line-height: 1.4; color: black; background-color: white; }
            .ticket { width: 80mm; padding: 5mm; box-sizing: border-box; margin: 0 auto; min-height: 100vh; }
            .center { text-align: center; margin: 1mm 0; }
            .ticket-title { font-size: 14px; font-weight: bold; margin-bottom: 3mm; }
            .separator { text-align: center; margin: 2mm 0; letter-spacing: -1px; }
            .item-row-header, .item-row { display: grid; grid-template-columns: 3fr 1fr 1.5fr; gap: 2mm; margin-bottom: 1mm; }
            .item-row-header { font-weight: bold; border-bottom: 1px dashed black; padding-bottom: 1mm; margin-bottom: 2mm; }
            .col-prod { text-align: left; word-break: break-word; }
            .col-qty { text-align: center; }
            .col-total { text-align: right; }
            .summary-row { display: flex; justify-content: space-between; font-size: 10px; font-weight: 500; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 2mm; }
          </style>
        </head>
        <body>
          ${ticketHTML}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(fullDocument);
    printWindow.document.close();

    setReceiptDetails(null);
    onClose();
  }, [receiptDetails, onClose]);

  const handleGenerate = async () => {
    if (!storeId) {
      toast.error('Por favor, selecciona una tienda.');
      return;
    }
    if (!date) {
      toast.error('Por favor, selecciona una fecha.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [productData, paymentData] = await Promise.all([
        v2_getDailySalesByProduct(date, storeId),
        v2_getDailySalesByPaymentMethod(date, storeId)
      ]);

      if (!productData || productData.length === 0) {
        toast.error('No se encontraron ventas para la fecha y tienda seleccionadas.');
        return;
      }

      setReceiptDetails({
        date,
        storeName: stores.find((s) => s.id === storeId)?.name ?? 'Tienda Desconocida',
        items: productData,
        paymentSummary: paymentData,
      });

    } catch (e) {
      const message = getErrorMessage(e);
      setError(message);
      toast.error(`Error al generar reporte: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Resumen diario"
      description="Imprime las ventas del día por producto y por método de pago."
      size="sm"
    >
      <div className={styles.form}>
        <Field label="Fecha" htmlFor="summary-date">
          <DatePicker value={date} onChange={setDate} label="Fecha del resumen" />
        </Field>

        {role === 'admin' && (
          <Field label="Tienda" htmlFor="summary-store">
            <SearchableSelect
              options={storeOptions}
              value={storeId ?? ''}
              onChange={(value) => setStoreId(value)}
              label="Tienda"
              placeholder="Selecciona una tienda"
              searchPlaceholder="Buscar tienda…"
              emptyMessage="No hay tiendas con ese nombre"
            />
          </Field>
        )}

        {error && (
          <Alert tone="danger" title="No se pudo generar el resumen">
            {error}
          </Alert>
        )}

        <FormActions>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button icon="bx-printer" loading={loading} onClick={handleGenerate}>
            Generar e imprimir
          </Button>
        </FormActions>
      </div>
    </Modal>
  );
};