// src/features/management/products/components/ProductForm.tsx

import { Controller, useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getProductDetails } from '../../../../api/products.api';
import { useCategories, useStores, useUpsertProduct } from '../../../../hooks/queries';
import type { ProductWithDetails } from '../../../../types';
import { getErrorMessage } from '../../../../lib/errors';
import { cx } from '../../../../lib/cx';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { Switch } from '../../../../components/ui/Switch';
import { Spinner } from '../../../../components/ui/Spinner';
import { Button } from '../../../../components/ui/Button';
import { FormActions } from '../../../../components/ui/FormActions';
import { SearchableSelect, type SelectOption } from '../../../../components/ui/SearchableSelect';
import styles from './ProductForm.module.css';

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
  /** Muestra el botón Cancelar */
  onCancel?: () => void;
}

export const ProductForm = ({ productToEdit, onFormSubmit, onCancel }: ProductFormProps) => {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'storePrices' });
  const upsertProduct = useUpsertProduct();

  const { data: categories = [] } = useCategories();
  const { data: allStores = [] } = useStores();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const watchStorePrices = watch('storePrices') ?? [];
  const watchImageFile = watch('imageFile');

  useEffect(() => {
    if (watchImageFile && watchImageFile.length > 0) {
      setSelectedFileName(watchImageFile[0].name);
    } else {
      setSelectedFileName(null);
    }
  }, [watchImageFile]);

  /* Vista previa de la imagen elegida, antes de guardar */
  const selectedFile = watchImageFile && watchImageFile.length > 0 ? watchImageFile[0] : null;
  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  const imageSrc = previewUrl ?? productToEdit?.image_url ?? null;
  /* Si la imagen actual no carga, se muestra la caja vacía en vez del ícono roto */
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const visibleImage = imageSrc && failedImage !== imageSrc ? imageSrc : null;

  useEffect(() => {
    const loadAndPopulateForm = async (product: ProductWithDetails) => {
      setLoadingDetails(true);
      try {
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
      } finally {
        setLoadingDetails(false);
      }
    };

    if (productToEdit) {
      loadAndPopulateForm(productToEdit);
    } else {
      reset({ name: '', description: '', category_id: 0, storePrices: [] });
    }
    setSelectedFileName(null);
  }, [productToEdit, reset]);

  const categoryOptions = useMemo<SelectOption[]>(
    () => categories.map((category) => ({ value: String(category.id), label: category.name, icon: 'bx-category' })),
    [categories]
  );

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
      toast.error(`Error guardando el producto: ${getErrorMessage(err)}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={styles.form}
      noValidate
      aria-busy={loadingDetails || undefined}
    >
      {loadingDetails && (
        <div className={styles.loadingOverlay}>
          <Spinner label="" />
          Cargando producto…
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.mainFields}>
          <Field label="Nombre" htmlFor="product-name" error={errors.name?.message} required>
            <Input
              id="product-name"
              placeholder="Helado de fresa"
              autoComplete="off"
              {...register('name', { required: 'El nombre es obligatorio' })}
            />
          </Field>

          <Field label="Categoría" htmlFor="product-category" error={errors.category_id?.message} required>
            <Controller
              name="category_id"
              control={control}
              rules={{
                validate: (value) => (typeof value === 'number' && value > 0) || 'La categoría es obligatoria',
              }}
              render={({ field }) => (
                <SearchableSelect
                  ref={field.ref}
                  value={field.value ? String(field.value) : ''}
                  options={categoryOptions}
                  label="Categoría"
                  placeholder="Selecciona una categoría"
                  searchPlaceholder="Buscar categoría…"
                  emptyMessage="No hay categorías con ese nombre"
                  onBlur={field.onBlur}
                  onChange={(value) => field.onChange(Number(value))}
                />
              )}
            />
          </Field>

          <Field label="Descripción" htmlFor="product-description" hint="Opcional.">
            <Textarea
              id="product-description"
              rows={3}
              placeholder="Dos bolas con topping a elección"
              {...register('description')}
            />
          </Field>
        </div>

        <Field label="Imagen" htmlFor="product-image" hint="PNG o JPG." className={styles.imageField}>
          <div
            className={cx(styles.dropzone, visibleImage && styles.hasImage, isDragging && styles.dragging)}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={() => setIsDragging(false)}
          >
            {visibleImage ? (
              <img src={visibleImage} alt="" className={styles.preview} onError={() => setFailedImage(visibleImage)} />
            ) : (
              <span className={styles.dropIcon} aria-hidden="true">
                <i className="bx bx-image-add" />
              </span>
            )}
            <span className={styles.dropText}>
              <span className={styles.dropTitle}>
                {selectedFileName ?? (imageSrc ? 'Cambiar imagen' : 'Elige o arrastra una imagen')}
              </span>
              {!visibleImage && (
                <span className={styles.dropHint}>
                  {imageSrc ? 'No se pudo cargar la imagen actual' : 'Haz clic o suelta el archivo aquí'}
                </span>
              )}
            </span>
            {/* El input cubre toda la caja: sirve para hacer clic y para soltar el archivo */}
            <input
              id="product-image"
              type="file"
              accept="image/png, image/jpeg"
              className={styles.fileInput}
              {...register('imageFile')}
            />
          </div>
        </Field>
      </div>

      <fieldset className={styles.stores}>
        <legend className={styles.storesLegend}>Tiendas y precios</legend>
        <p className={styles.storesHelp}>
          Desmarcar una tienda borra su precio. Si solo quieres que no aparezca en el
          Punto de Venta, apaga “Visible en POS”.
        </p>

        <div className={styles.storeGrid}>
          {allStores.map((store) => {
            const fieldIndex = fields.findIndex((f) => f.store_id === store.id);
            const isChecked = fieldIndex !== -1;
            const isActive = isChecked ? (watchStorePrices[fieldIndex]?.is_active ?? true) : true;
            const priceError = isChecked ? errors.storePrices?.[fieldIndex]?.price : undefined;

            return (
              <div
                key={store.id}
                className={cx(
                  styles.storeCard,
                  isChecked && styles.storeChecked,
                  isChecked && !isActive && styles.storeHidden
                )}
              >
                <Checkbox
                  id={`store-check-${store.id}`}
                  checked={isChecked}
                  onChange={(e) => handleStoreCheckboxChange(store.id, e.target.checked)}
                  label={store.name}
                  description={store.address ?? undefined}
                  className={styles.storeCheck}
                />

                {isChecked && (
                  <div className={styles.storeBody}>
                    <div className={styles.priceField}>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        prefixText="S/"
                        placeholder="0.00"
                        aria-label={`Precio en ${store.name}`}
                        invalid={!!priceError}
                        {...register(`storePrices.${fieldIndex}.price`, {
                          required: 'Precio es obligatorio',
                          valueAsNumber: true,
                          min: 0,
                        })}
                      />
                      {priceError && (
                        <p className={styles.priceError} role="alert">
                          <i className="bx bx-error-circle" aria-hidden="true" />
                          {priceError.message || 'Precio inválido'}
                        </p>
                      )}
                    </div>
                    <Switch
                      size="sm"
                      checked={isActive}
                      onChange={(value) => handleActiveChange(fieldIndex, value)}
                      label={isActive ? 'Visible en POS' : 'Oculto en POS'}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {errors.storePrices?.message && <p className={styles.storesError}>{errors.storePrices.message}</p>}
      </fieldset>

      <FormActions>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} disabled={loadingDetails}>
          {productToEdit ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </FormActions>
    </form>
  );
};