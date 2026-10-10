// src/features/pos/components/OpenCashShiftModal.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { openCashShift } from '../../../api/shifts.api'; // CORRECTO: Ruta
import type { CashShift } from '../../../types'; // CORRECTO: Ruta
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../lib/formatters';
import styles from './OpenCashShiftModal.module.css'; // CORRECTO: Ruta

interface OpenShiftFormData {
  opening_balance: number;
}

interface OpenCashShiftModalProps {
  userId: string;
  storeId: string;
  onShiftOpened: (shift: CashShift) => void;
  onClose: () => void;
}

export const OpenCashShiftModal = ({ userId, storeId, onShiftOpened}: OpenCashShiftModalProps) => {
  const { register, handleSubmit, formState: { isSubmitting, errors }, setValue } = useForm<OpenShiftFormData>();
  const [initialAmount, setInitialAmount] = useState<number>(0);

  useEffect(() => {
    setValue('opening_balance', 0);
  }, [setValue]);

  const onSubmit: SubmitHandler<OpenShiftFormData> = async (data) => {
    try {
      if (data.opening_balance < 0) {
        toast.error("El monto de apertura no puede ser negativo.");
        return;
      }
      const newShift = await openCashShift(userId, storeId, data.opening_balance);
      onShiftOpened(newShift);
    } catch (err: any) {
      toast.error(`Error al abrir caja: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <p>Ingresa el monto inicial en caja al abrir el día.</p>
      
      <div className={styles.formGroup}>
        <label htmlFor="opening_balance">Monto de Apertura ({formatCurrency(initialAmount)})</label>
        <input 
          id="opening_balance"
          type="number" 
          step="0.01" 
          {...register('opening_balance', { 
            required: "El monto de apertura es obligatorio.", 
            valueAsNumber: true,
            min: {value: 0, message: "El monto no puede ser negativo."}
          })} 
          className={styles.input}
          onChange={(e) => setInitialAmount(parseFloat(e.target.value) || 0)}
        />
        {errors.opening_balance && <span className={styles.errorText}>{errors.opening_balance.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Abriendo...' : 'Abrir Caja'}
      </button>
    </form>
  );
};