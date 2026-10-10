// src/features/pos/components/PaymentModalForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentMethods, useStores } from '../../../hooks/queries';
import { useUserStore } from '../../../store/userStore';
import { useCartStore } from '../../../store/cartStore';
import { formatCurrency } from '../../../lib/formatters';
import { recordSale, SaleError } from '../../../api/sales.api';
import type { CartItem } from '../../../types';
import styles from './PaymentModalForm.module.css';
import toast from 'react-hot-toast';

interface PaymentFormData {
  payment_method_id: number;
  paid_amount: number | '';
  print_receipt: 'yes' | 'no';
}

export interface PaymentModalFormProps {
  onClose: () => void;
  onSaleSuccess: () => void;
  activeStoreId: string | null;
}

const printSaleTicket = (saleDetails: {
  items: CartItem[];
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethodName: string;
  storeName: string;
}) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('No se pudo abrir la ventana de impresión. Revisa los permisos de pop-ups.');
    return;
  }

  const { items, totalAmount, paidAmount, changeAmount, storeName } = saleDetails;
  const formattedDate = new Date().toLocaleDateString('es-PE');
  const formattedTime = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

  const ticketHTML = `
    <div class="ticket">
      <h3 class="center ticket-title">${storeName.toUpperCase()}</h3>
      <p class="center">Fecha: ${formattedDate} ${formattedTime}</p>
      <p class="separator">--------------------------------</p>
      <div class="item-row-header">
        <span class="col-prod">PRODUCTO</span>
        <span class="col-qty">CANT</span>
        <span class="col-total">TOTAL</span>
      </div>
      ${items.map(item => `
        <div class="item-row">
          <span class="col-prod">${item.name}</span>
          <span class="col-qty">${item.quantity}</span>
          <span class="col-total">${formatCurrency(item.price * item.quantity)}</span>
        </div>
      `).join('')}
      <p class="separator">--------------------------------</p>
      <div class="summary-row"><span>SUBTOTAL:</span><span>${formatCurrency(totalAmount)}</span></div>
      <p class="separator">--------------------------------</p>
      <div class="summary-row total-row"><span>TOTAL:</span><span>${formatCurrency(totalAmount)}</span></div>
      <div class="summary-row"><span>PAGADO:</span><span>${formatCurrency(paidAmount)}</span></div>
      <div class="summary-row"><span>CAMBIO:</span><span>${formatCurrency(changeAmount)}</span></div>
      <p class="separator">--------------------------------</p>
      <p class="center">¡Gracias por su compra!</p>
      <p class="center">POS Super Helado</p>
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>Ticket de Venta</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        @media print { body { margin: 0; } }
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
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
        .summary-row { display: flex; justify-content: space-between; margin: 1mm 0; }
        .total-row { font-size: 12px; font-weight: bold; margin-top: 2mm; }
      </style>
      </head><body>${ticketHTML}</body></html>`);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};

export const PaymentModalForm = ({ onClose, onSaleSuccess, activeStoreId }: PaymentModalFormProps) => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PaymentFormData>({
    defaultValues: { print_receipt: 'no', paid_amount: '' },
  });

  const queryClient = useQueryClient();
  const { data: paymentMethods = [], isLoading: isLoadingMethods } = usePaymentMethods();
  const { data: allStores = [] } = useStores();

  const { items, getTotal, clearCart, removeFromCart, updatePrice } = useCartStore();
  const { user } = useUserStore();

  const totalAmount = getTotal();
  const watchedPaidAmount = watch('paid_amount');
  const paidAmountNumber = typeof watchedPaidAmount === 'number' ? watchedPaidAmount : 0;
  const changeAmount = paidAmountNumber >= totalAmount ? paidAmountNumber - totalAmount : 0;

  const currentStoreName = allStores.find(s => s.id === activeStoreId)?.name || 'Tienda Principal';

  const refreshPosProducts = () => queryClient.invalidateQueries({ queryKey: ['pos-products'] });

  // La BD rechazó la venta: corregimos el carrito y explicamos qué pasó
  const handleSaleError = (err: unknown) => {
    console.error('Error al procesar la venta:', err);

    if (!(err instanceof SaleError)) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al procesar la venta: ${message}`);
      return;
    }

    // Productos desactivados (o quitados de la tienda) mientras estaban en el carrito
    if (err.code === 'PRODUCT_INACTIVE' && err.products.length > 0) {
      err.products.forEach((product) => removeFromCart(product.product_id));
      void refreshPosProducts();

      const names = err.products.map((product) => product.name).join(', ');
      toast.error(
        `Se quitaron del pedido porque ya no están disponibles en esta tienda: ${names}. ` +
        'Revisa el total y confirma de nuevo.',
        { duration: 7000 },
      );

      if (useCartStore.getState().items.length === 0) onClose();
      return;
    }

    // El precio cambió desde que se agregó al carrito
    if (err.code === 'PRICE_CHANGED' && err.products.length > 0) {
      err.products.forEach((product) => {
        if (product.new_price != null) updatePrice(product.product_id, Number(product.new_price));
      });
      void refreshPosProducts();

      const changes = err.products
        .map((product) => {
          const newPrice = formatCurrency(Number(product.new_price ?? 0));
          return product.old_price != null
            ? `${product.name} (${formatCurrency(Number(product.old_price))} → ${newPrice})`
            : `${product.name} (${newPrice})`;
        })
        .join(', ');

      toast.error(
        `Cambió el precio de: ${changes}. El pedido ya tiene los precios nuevos; ` +
        'revisa el total y confirma de nuevo.',
        { duration: 7000 },
      );
      return;
    }

    toast.error(err.message);
  };

  const onSubmit: SubmitHandler<PaymentFormData> = async (data) => {
    if (!user || !activeStoreId) {
      toast.error('Error: Usuario o tienda no disponibles.');
      return;
    }
    if (items.length === 0) {
      toast.error('El carrito está vacío.');
      return;
    }

    const finalPaidAmount = (typeof data.paid_amount === 'number' && data.paid_amount >= totalAmount) ? data.paid_amount : totalAmount;
    const finalChangeAmount = finalPaidAmount - totalAmount;

    try {
      await recordSale({
        store_id: activeStoreId,
        user_id: user.id,
        total_amount: totalAmount,
        payment_method_id: data.payment_method_id,
        paid_amount: finalPaidAmount,
        change_amount: finalChangeAmount,
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price_at_sale: item.price,
        })),
      });

      toast.success('¡Venta procesada con éxito!');

      // Invalidar cache de ventas para que el historial y los reportes se actualicen sin recargar
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['daily-product-summary'] }),
      ]);

      if (data.print_receipt === 'yes') {
        printSaleTicket({
          items,
          totalAmount,
          paidAmount: finalPaidAmount,
          changeAmount: finalChangeAmount,
          paymentMethodName: paymentMethods.find(m => m.id === data.payment_method_id)?.name || 'N/A',
          storeName: currentStoreName,
        });
      }

      clearCart();
      onSaleSuccess();
      onClose();
    } catch (err) {
      handleSaleError(err);
    }
  };

  if (isLoadingMethods) return <div>Cargando...</div>;
  if (paymentMethods.length === 0) return <div>No hay métodos de pago configurados.</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formGroup}>
        <label>Método de Pago</label>
        <div className={styles.paymentMethodButtons}>
          {paymentMethods.map(method => (
            <label key={method.id} className={styles.paymentMethodLabel}>
              <input type="radio" {...register('payment_method_id', { required: true, valueAsNumber: true })} value={method.id} defaultChecked={method.id === paymentMethods[0]?.id} />
              <span className={styles.paymentMethodName}>{method.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.infoField}>
        <span>Total de la Venta:</span>
        <span className={styles.totalAmount}>{formatCurrency(totalAmount)}</span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="paid_amount">Pago Con</label>
        <input
          id="paid_amount"
          type="number"
          step="0.01"
          {...register('paid_amount', {
            valueAsNumber: true,
            min: { value: totalAmount, message: 'El pago debe ser mayor o igual al total.' },
          })}
          className={styles.input}
          placeholder="(Opcional)"
        />
        {errors.paid_amount && <span className={styles.errorText}>{errors.paid_amount.message}</span>}
      </div>

      <div className={styles.infoField}>
        <span>Cambio:</span>
        <span className={styles.changeAmount}>{formatCurrency(changeAmount)}</span>
      </div>

      <div className={styles.formGroup}>
        <label>Imprimir Ticket</label>
        <div className={styles.printOptions}>
          <label className={styles.radioLabel}>
            <input type="radio" {...register('print_receipt')} value="yes" />
            <span>Sí</span>
          </label>
          <label className={styles.radioLabel}>
            <input type="radio" {...register('print_receipt')} value="no" />
            <span>No</span>
          </label>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting || items.length === 0} className={styles.submitButton}>
        {isSubmitting ? 'Procesando...' : 'Confirmar Venta'}
      </button>
    </form>
  );
};