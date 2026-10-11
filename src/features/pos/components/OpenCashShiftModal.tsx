// src/features/pos/components/OpenCashShiftModal.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';
import { openCashShift } from '../../../api/shifts.api';
import type { CashShift } from '../../../types';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../lib/formatters';
import { getErrorMessage } from '../../../lib/errors';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FormActions } from '../../../components/ui/FormActions';
import styles from './OpenCashShiftModal.module.css';

interface OpenShiftFormData {
  opening_balance: number;
}

interface OpenCashShiftModalProps {
  userId: string;
  storeId: string;
  onShiftOpened: (shift: CashShift) => void;
  onClose: () => void;
}

export const OpenCashShiftModal = ({ userId, storeId, onShiftOpened, onClose }: OpenCashShiftModalProps) => {
  const { register, handleSubmit, formState: { isSubmitting, errors }, setValue, watch } = useForm<OpenShiftFormData>();

  useEffect(() => {
    setValue('opening_balance', 0);
  }, [setValue]);

  /* Antes un onChange propio reemplazaba al de react-hook-form y el monto
     escrito no llegaba al formulario. Ahora se lee con watch. */
  const watchedAmount = watch('opening_balance');
  const amount = typeof watchedAmount === 'number' && !Number.isNaN(watchedAmount) ? watchedAmount : 0;

  const onSubmit: SubmitHandler<OpenShiftFormData> = async (data) => {
    try {
      if (data.opening_balance < 0) {
        toast.error('El monto de apertura no puede ser negativo.');
        return;
      }
      const newShift = await openCashShift(userId, storeId, data.opening_balance);
      onShiftOpened(newShift);
    } catch (err) {
      toast.error(`Error al abrir caja: ${getErrorMessage(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <div className={styles.hero}>
        <span className={styles.heroIcon} aria-hidden="true">
          <i className="bx bx-wallet" />
        </span>
        <p className={styles.heroText}>Ingresa el monto inicial en caja al abrir el día.</p>
      </div>

      <Field
        label="Monto de apertura"
        htmlFor="opening_balance"
        error={errors.opening_balance?.message}
        hint={`Se registrará ${formatCurrency(amount)}.`}
        required
      >
        <Input
          id="opening_balance"
          type="number"
          step="0.01"
          inputMode="decimal"
          size="lg"
          prefixText="S/"
          placeholder="0.00"
          {...register('opening_balance', {
            required: 'El monto de apertura es obligatorio.',
            valueAsNumber: true,
            min: { value: 0, message: 'El monto no puede ser negativo.' },
          })}
        />
      </Field>

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" icon="bx-log-in-circle" loading={isSubmitting}>
          Abrir caja
        </Button>
      </FormActions>
    </form>
  );
};