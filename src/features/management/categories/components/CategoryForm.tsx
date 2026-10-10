// src/features/management/categories/components/CategoryForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createCategory, updateCategory } from '../../../../api/categories.api';
import type { Category } from '../../../../types';
import styles from './CategoryForm.module.css';
import toast from 'react-hot-toast';

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
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="name">Nombre de la Categoría</label>
        <input
          id="name"
          type="text"
          {...register("name", { required: "El nombre es obligatorio" })}
          className={styles.input}
          disabled={isSubmitting}
        />
        {errors.name && <span className={styles.errorText}>{errors.name.message}</span>}
      </div>
      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Guardando...' : 'Guardar Categoría'}
      </button>
    </form>
  );
};