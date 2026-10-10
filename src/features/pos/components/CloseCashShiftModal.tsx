// FILE: src/features/pos/components/CloseCashShiftModal.tsx
// DESC: Reemplaza todo el contenido de este archivo.

import { useForm, type SubmitHandler } from 'react-hook-form';
import { v2_closeCashShift } from '../../../api/shifts.api';
import type { CashShift } from '../../../types';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../lib/formatters';
import styles from './CloseCashShiftModal.module.css';

interface CloseShiftFormData {
  counted_balance: number;
}

interface CloseCashShiftModalProps {
  shift: CashShift;
  totalSales: number;
  onShiftClosed: () => void;
  onClose: () => void;
}

export const CloseCashShiftModal = ({ shift, totalSales, onShiftClosed, onClose }: CloseCashShiftModalProps) => {
  const { register, handleSubmit, formState: { isSubmitting, errors }, watch } = useForm<CloseShiftFormData>({
    // Establecemos un valor por defecto para el campo
    defaultValues: {
      counted_balance: 0
    }
  });
  
  // --- CAMBIO: Aseguramos que 'countedBalance' sea siempre un número ---
  const countedBalanceInput = watch('counted_balance');
  const countedBalance = typeof countedBalanceInput === 'number' ? countedBalanceInput : 0;

  const realSalesCalculated = totalSales; 
  const expectedBalance = shift.opening_balance + realSalesCalculated;
  const difference = countedBalance - expectedBalance;

  const onSubmit: SubmitHandler<CloseShiftFormData> = async (data) => {
    try {
      await v2_closeCashShift({
        shiftId: shift.id,
        closingBalance: expectedBalance,
        calculatedSales: realSalesCalculated,
        countedBalance: data.counted_balance, // Aquí ya es un número gracias a RHF
      });
      
      onShiftClosed();
      onClose();
    } catch (err: any) {
      toast.error(`Error al cerrar caja: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <p>Confirma el monto en caja al cerrar el día.</p>
      
      <div className={styles.infoField}>
        <span>Monto de Apertura:</span>
        <span>{formatCurrency(shift.opening_balance)}</span>
      </div>
      <div className={styles.infoField}>
        <span>Ventas del Día:</span>
        <span>{formatCurrency(realSalesCalculated)}</span>
      </div>
      <div className={styles.infoField}>
        <span>Saldo Esperado:</span>
        <span style={{ fontWeight: 'bold' }}>{formatCurrency(expectedBalance)}</span>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="counted_balance">Monto Contado en Caja</label>
        <input 
          id="counted_balance"
          type="number" 
          step="0.01" 
          {...register('counted_balance', { 
            required: "El monto contado es obligatorio.", 
            valueAsNumber: true,
            min: {value: 0, message: "El monto no puede ser negativo."}
          })} 
          className={styles.input}
          placeholder='0.00'
        />
        {errors.counted_balance && <span className={styles.errorText}>{errors.counted_balance.message}</span>}
      </div>

      <div className={styles.infoField} style={{ color: difference !== 0 ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 'bold' }}>
        <span>Diferencia:</span>
        {/* 'difference' ahora siempre será un número, por lo que no dará NaN */}
        <span>{formatCurrency(difference)}</span>
      </div>

      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Cerrando...' : 'Cerrar Caja'}
      </button>
    </form>
  );
};