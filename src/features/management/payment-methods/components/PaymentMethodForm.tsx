// src/features/management/payment-methods/components/PaymentMethodForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createPaymentMethod, updatePaymentMethod } from '../../../../api/paymentMethods.api';
import type { PaymentMethod } from '../../../../types';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Button } from '../../../../components/ui/Button';
import { FormActions } from '../../../../components/ui/FormActions';
import styles from './PaymentMethodForm.module.css';

interface PaymentMethodFormData {
  name: string;
  description: string;
}

interface PaymentMethodFormProps {
  methodToEdit: PaymentMethod | null;
  onFormSubmit: (successMessage: string) => void;
  onClose: () => void;
}

export const PaymentMethodForm = ({ methodToEdit, onFormSubmit, onClose }: PaymentMethodFormProps) => {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<PaymentMethodFormData>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (methodToEdit) {
      reset({
        name: methodToEdit.name,
        description: methodToEdit.description || '',
      });
    } else {
      reset({ name: '', description: '' });
    }
  }, [methodToEdit, reset]);

  const onSubmit: SubmitHandler<PaymentMethodFormData> = async (data) => {
    try {
      let message = '';
      if (methodToEdit) {
        await updatePaymentMethod(methodToEdit.id, data);
        message = 'Método de pago actualizado con éxito!';
      } else {
        await createPaymentMethod(data);
        message = 'Método de pago creado con éxito!';
      }
      // Invalidar la cache para que la lista se actualice inmediatamente
      await queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      onFormSubmit(message);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error: ${message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <Field label="Nombre" htmlFor="payment-method-name" error={errors.name?.message} required>
        <Input
          id="payment-method-name"
          placeholder="Efectivo"
          autoComplete="off"
          {...register('name', { required: 'El nombre es obligatorio' })}
        />
      </Field>

      <Field label="Descripción" htmlFor="payment-method-description" hint="Opcional.">
        <Textarea
          id="payment-method-description"
          rows={3}
          placeholder="Pago en efectivo en caja"
          {...register('description')}
        />
      </Field>

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {methodToEdit ? 'Guardar cambios' : 'Crear método'}
        </Button>
      </FormActions>
    </form>
  );
};