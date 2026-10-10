// src/features/management/products/components/ProductForm.tsx

import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { getProductDetails } from '../../../../api/products.api';
import { useCategories, useStores, useUpsertProduct } from '../../../../hooks/queries';
import { Switch } from '../../../../components/ui/Switch';
import type { ProductWithDetails } from '../../../../types';
import styles from './ProductForm.module.css';
import toast from 'react-hot-toast';

interface StorePriceField {
  store_id: string;
  price: number;
  /** Visible en el Punto de Venta de esa tienda */
  is_active: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  category_id: number;
  imageFile?: FileList;
  storePrices: StorePriceField[];
}

interface ProductFormProps {
  productToEdit: ProductWithDetails | null;
  onFormSubmit: () => void;
}

export const ProductForm = ({ productToEdit, onFormSubmit }: ProductFormProps) => {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'storePrices' });
  const upsertProduct = useUpsertProduct();

  const { data: categories = [] } = useCategories();
  const { data: allStores = [] } = useStores();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const watchStorePrices = watch('storePrices') ?? [];
  const watchImageFile = watch('imageFile');

  useEffect(() => {
    if (watchImageFile && watchImageFile.length > 0) {
      setSelectedFileName(watchImageFile[0].name);
    } else {
      setSelectedFileName(null);
    }
  }, [watchImageFile]);

  useEffect(() => {
    const loadAndPopulateForm = async (product: ProductWithDetails) => {
      const detailed = await getProductDetails(product.id);
      if (detailed) {
        reset({
          name: detailed.name,
          description: detailed.description || '',
          category_id: detailed.category_id,
          storePrices: detailed.store_products.map((link) => ({
            store_id: link.store_id,
            price: link.price,
            is_active: link.is_active ?? true,
          })),
        });
      }
    };

    if (productToEdit) {
      loadAndPopulateForm(productToEdit);
    } else {
      reset({ name: '', description: '', category_id: 0, storePrices: [] });
    }
    setSelectedFileName(null);
  }, [productToEdit, reset]);

  const handleStoreCheckboxChange = (storeId: string, isChecked: boolean) => {
    const idx = fields.findIndex((f) => f.store_id === storeId);
    if (isChecked) {
      // Las tiendas nuevas arrancan visibles en el POS
      if (idx === -1) append({ store_id: storeId, price: 0, is_active: true });
    } else {
      if (idx !== -1) remove(idx);
    }
  };

  const handleActiveChange = (fieldIndex: number, isActive: boolean) => {
    setValue(`storePrices.${fieldIndex}.is_active`, isActive, { shouldDirty: true });
  };

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    try {
      await upsertProduct.mutateAsync({
        data: {
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          imageFile: data.imageFile?.[0],
          image_url: productToEdit?.image_url,
          storePrices: (data.storePrices ?? []).map((sp) => ({
            store_id: sp.store_id,
            price: sp.price,
            is_active: sp.is_active ?? true,
          })),
        },
        productId: productToEdit?.id,
      });

      // El hook ya refrescó gestión, detalle y POS (sin recargar la página)
      toast.success(productToEdit ? 'Producto actualizado con éxito!' : 'Producto creado con éxito!');
      onFormSubmit();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error guardando el producto: ${message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Nombre del Producto</label>
          <input {...register('name', { required: 'Nombre es obligatorio' })} />
          {errors.name && <p className={styles.errorText}>{errors.name.message}</p>}
        </div>
        <div className={styles.formGroup}>
          <label>Categoría</label>
          <select {...register('category_id', { required: 'Categoría es obligatoria', valueAsNumber: true })}>
            <option value="">Selecciona una categoría</option>
            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          {errors.category_id && <p className={styles.errorText}>{errors.category_id.message}</p>}
        </div>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Descripción</label>
          <textarea {...register('description')} rows={3}></textarea>
        </div>

        <div className={styles.formGroup}>
          <label>Imagen</label>
          <label htmlFor="imageFile" className={styles.fileUploadBox}>
            <i className='bx bx-upload'></i>
            <span>{selectedFileName || 'Seleccionar o arrastrar archivo'}</span>
            <input id="imageFile" type="file" accept="image/png, image/jpeg" {...register('imageFile')} />
          </label>
          {productToEdit?.image_url && (
            <div className={styles.imagePreview}>
              <p>Imagen actual:</p>
              <img src={productToEdit.image_url} alt="Vista previa" />
            </div>
          )}
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Disponible en Tiendas y Precios</label>
          <p className={styles.helpText}>
            Desmarcar una tienda borra su precio. Si solo quieres que no aparezca en el
            Punto de Venta, apaga “Visible en POS”.
          </p>
          <div className={styles.storeSelectionGrid}>
            {allStores.map((store) => {
              const fieldIndex = fields.findIndex((f) => f.store_id === store.id);
              const isChecked = fieldIndex !== -1;
              const isActive = isChecked ? (watchStorePrices[fieldIndex]?.is_active ?? true) : true;

              const itemClass = [
                styles.storeItem,
                isChecked ? styles.storeItemChecked : '',
                isChecked && !isActive ? styles.storeItemInactive : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div key={store.id} className={itemClass}>
                  <label className={styles.storeItemHeader} htmlFor={`store-check-${store.id}`}>
                    <input
                      type="checkbox"
                      id={`store-check-${store.id}`}
                      checked={isChecked}
                      onChange={(e) => handleStoreCheckboxChange(store.id, e.target.checked)}
                    />
                    <span>{store.name}</span>
                  </label>
                  {isChecked && (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        {...register(`storePrices.${fieldIndex}.price`, {
                          required: 'Precio es obligatorio',
                          valueAsNumber: true,
                          min: 0,
                        })}
                        className={styles.priceInput}
                      />
                      <div className={styles.storeItemFooter}>
                        <Switch
                          size="sm"
                          checked={isActive}
                          onChange={(value) => handleActiveChange(fieldIndex, value)}
                          label={isActive ? 'Visible en POS' : 'Oculto en POS'}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {errors.storePrices && <p className={styles.errorText}>{errors.storePrices.message}</p>}
        </div>
      </div>
      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
      </button>
    </form>
  );
};