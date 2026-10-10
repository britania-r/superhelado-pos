// src/features/management/stores/components/StoreForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createStore, updateStore } from '../../../../api/stores.api';
import type { Store } from '../../../../types';
import styles from './StoreForm.module.css';
import toast from 'react-hot-toast';

interface StoreFormData {
  name: string;
  address: string;
}

interface StoreFormProps {
  storeToEdit: Store | null;
  onFormSubmit: (successMessage: string) => void;
  onClose: () => void;
}

export const StoreForm = ({ storeToEdit, onFormSubmit, onClose }: StoreFormProps) => {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<StoreFormData>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (storeToEdit) {
      reset({ name: storeToEdit.name, address: storeToEdit.address || '' });
    } else {
      reset({ name: '', address: '' });
    }
  }, [storeToEdit, reset]);

  const onSubmit: SubmitHandler<StoreFormData> = async (data) => {
    try {
      let message = '';
      if (storeToEdit) {
        await updateStore(storeToEdit.id, data);
        message = 'Tienda actualizada con éxito!';
      } else {
        await createStore(data);
        message = 'Tienda creada con éxito!';
      }
      await queryClient.invalidateQueries({ queryKey: ['stores'] });
      onFormSubmit(message);
      onClose();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="name">Nombre de la Tienda</label>
        <input
          id="name"
          type="text"
          {...register("name", { required: "El nombre es obligatorio" })}
          className={styles.input}
          disabled={isSubmitting}
        />
        {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="address">Dirección (opcional)</label>
        <textarea
          id="address"
          {...register("address")}
          rows={3}
          className={styles.input}
          disabled={isSubmitting}
        ></textarea>
      </div>
      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Guardando...' : 'Guardar Tienda'}
      </button>
    </form>
  );
};