// src/features/pos/components/CloseCashShiftModal.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { v2_closeCashShift } from '../../../api/shifts.api';
import type { CashShift } from '../../../types';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../lib/formatters';
import { getErrorMessage } from '../../../lib/errors';
import { getCashDifferenceStatus } from '../../../lib/cash';
import { cx } from '../../../lib/cx';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FormActions } from '../../../components/ui/FormActions';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
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

  // Aseguramos que 'countedBalance' sea siempre un número
  const countedBalanceInput = watch('counted_balance');
  const countedBalance = typeof countedBalanceInput === 'number' && !Number.isNaN(countedBalanceInput) ? countedBalanceInput : 0;

  const realSalesCalculated = totalSales;
  const expectedBalance = shift.opening_balance + realSalesCalculated;
  const difference = countedBalance - expectedBalance;
  const status = getCashDifferenceStatus(difference);

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
    } catch (err) {
      toast.error(`Error al cerrar caja: ${getErrorMessage(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      {/* ── Lo que debería haber en caja ── */}
      <dl className={styles.breakdown}>
        <div className={styles.line}>
          <dt>Monto de apertura</dt>
          <dd>{formatCurrency(shift.opening_balance)}</dd>
        </div>
        <div className={styles.line}>
          <dt>Ventas del día</dt>
          <dd>+ {formatCurrency(realSalesCalculated)}</dd>
        </div>
        <div className={cx(styles.line, styles.expected)}>
          <dt>Saldo esperado</dt>
          <dd>{formatCurrency(expectedBalance)}</dd>
        </div>
      </dl>

      {realSalesCalculated === 0 && (
        <Alert tone="info" title="Ventas del día en S/ 0.00">
          Si hubo ventas hoy, cierra esta ventana y genera el reporte de hoy antes de cerrar la caja.
        </Alert>
      )}

      {/* ── Lo que hay ── */}
      <Field label="Monto contado en caja" htmlFor="counted_balance" error={errors.counted_balance?.message} required>
        <Input
          id="counted_balance"
          type="number"
          step="0.01"
          inputMode="decimal"
          size="lg"
          prefixText="S/"
          placeholder="0.00"
          {...register('counted_balance', {
            required: 'El monto contado es obligatorio.',
            valueAsNumber: true,
            min: { value: 0, message: 'El monto no puede ser negativo.' }
          })}
        />
      </Field>

      <div className={cx(styles.difference, styles[status.tone])} aria-live="polite">
        <span className={styles.differenceLabel}>Diferencia</span>
        <span className={styles.differenceValue}>{formatCurrency(difference)}</span>
        <Badge tone={status.tone} icon={status.icon}>{status.label}</Badge>
      </div>

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" icon="bx-log-out-circle" loading={isSubmitting}>
          Cerrar caja
        </Button>
      </FormActions>
    </form>
  );
};