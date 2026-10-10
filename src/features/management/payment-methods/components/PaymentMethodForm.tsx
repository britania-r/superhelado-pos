// src/features/management/payment-methods/components/PaymentMethodForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPaymentMethod, updatePaymentMethod } from '../../../../api/paymentMethods.api';
import type { PaymentMethod } from '../../../../types';
import styles from './PaymentMethodForm.module.css';
import toast from 'react-hot-toast';

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
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          type="text"
          {...register("name", { required: "El nombre es obligatorio" })}
          className={styles.input}
        />
        {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="description">Descripción (opcional)</label>
        <textarea
          id="description"
          {...register("description")}
          rows={3}
          className={styles.input}
        ></textarea>
      </div>
      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Guardando...' : 'Guardar Método'}
      </button>
    </form>
  );
};