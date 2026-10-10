// src/features/management/stores/components/StoreForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createStore, updateStore } from '../../../../api/stores.api';
import type { Store } from '../../../../types';
import { getErrorMessage } from '../../../../lib/errors';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Button } from '../../../../components/ui/Button';
import { FormActions } from '../../../../components/ui/FormActions';
import styles from './StoreForm.module.css';

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
    } catch (err) {
      toast.error(`Error: ${getErrorMessage(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <Field label="Nombre" htmlFor="store-name" error={errors.name?.message} required>
        <Input
          id="store-name"
          icon="bx-store-alt"
          placeholder="Tienda Centro"
          autoComplete="off"
          disabled={isSubmitting}
          {...register('name', { required: 'El nombre es obligatorio' })}
        />
      </Field>

      <Field label="Dirección" htmlFor="store-address" hint="Opcional.">
        <Textarea
          id="store-address"
          rows={3}
          placeholder="Av. Principal 123"
          disabled={isSubmitting}
          {...register('address')}
        />
      </Field>

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {storeToEdit ? 'Guardar cambios' : 'Crear tienda'}
        </Button>
      </FormActions>
    </form>
  );
};