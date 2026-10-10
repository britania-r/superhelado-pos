// src/features/management/categories/components/CategoryForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createCategory, updateCategory } from '../../../../api/categories.api';
import type { Category } from '../../../../types';
import { getErrorMessage } from '../../../../lib/errors';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { FormActions } from '../../../../components/ui/FormActions';
import styles from './CategoryForm.module.css';

interface CategoryFormData {
  name: string;
}

interface CategoryFormProps {
  categoryToEdit: Category | null;
  onFormSubmit: () => void;
  onClose: () => void;
}

export const CategoryForm = ({ categoryToEdit, onFormSubmit, onClose }: CategoryFormProps) => {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<CategoryFormData>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (categoryToEdit) {
      reset({ name: categoryToEdit.name });
    } else {
      reset({ name: '' });
    }
  }, [categoryToEdit, reset]);

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    try {
      if (categoryToEdit) {
        await updateCategory(categoryToEdit.id, data.name);
      } else {
        await createCategory(data.name);
      }
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      onFormSubmit();
      onClose();
    } catch (err) {
      toast.error(`Error: ${getErrorMessage(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <Field label="Nombre" htmlFor="category-name" error={errors.name?.message} required>
        <Input
          id="category-name"
          icon="bx-category"
          placeholder="Helados"
          autoComplete="off"
          disabled={isSubmitting}
          {...register('name', { required: 'El nombre es obligatorio' })}
        />
      </Field>

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {categoryToEdit ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </FormActions>
    </form>
  );
};