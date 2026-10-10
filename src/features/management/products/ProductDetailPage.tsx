// src/features/management/products/ProductDetailPage.tsx

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductDetails, useDeleteProduct, useSetStoreProductActive } from '../../../hooks/queries';
import { formatCurrency } from '../../../lib/formatters';
import { Modal } from '../../../components/ui/Modal';
import { Switch } from '../../../components/ui/Switch';
import { ProductForm } from './components/ProductForm';
import styles from './ProductDetailPage.module.css';
import toast from 'react-hot-toast';

export const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: product, isLoading, error } = useProductDetails(productId);
  const deleteProduct = useDeleteProduct();
  const setActive = useSetStoreProductActive();

  // Tiendas ordenadas por nombre para que la tabla no "salte" al refrescar
  const storeLinks = useMemo(
    () =>
      [...(product?.store_products ?? [])].sort((a, b) =>
        (a.stores?.name ?? '').localeCompare(b.stores?.name ?? '', 'es')
      ),
    [product]
  );
  const activeCount = storeLinks.filter((link) => link.is_active).length;
  const allActive = storeLinks.length > 0 && activeCount === storeLinks.length;

  const handleOpenEditModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleProductSaved = () => handleCloseModal();

  const handleToggleStore = (storeId: string, storeName: string, isActive: boolean) => {
    if (!productId) return;

    setActive.mutate(
      { productId, storeIds: [storeId], isActive },
      {
        onSuccess: () => toast.success(isActive ? `Visible en ${storeName}` : `Oculto en ${storeName}`),
        onError: (err) => toast.error(`No se pudo actualizar ${storeName}: ${err.message}`),
      }
    );
  };

  const handleToggleAll = () => {
    if (!productId || storeLinks.length === 0) return;

    const nextActive = !allActive;
    const question = nextActive
      ? '¿Mostrar este producto en el Punto de Venta de todas sus tiendas?'
      : '¿Ocultar este producto del Punto de Venta en todas sus tiendas?';
    if (!window.confirm(question)) return;

    setActive.mutate(
      { productId, storeIds: storeLinks.map((link) => link.store_id), isActive: nextActive },
      {
        onSuccess: () =>
          toast.success(nextActive ? 'Producto visible en todas sus tiendas.' : 'Producto oculto en todas sus tiendas.'),
        onError: (err) => toast.error(`No se pudo actualizar: ${err.message}`),
      }
    );
  };

  const handleDelete = async () => {
    if (!productId) return;
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.")) {
      try {
        await deleteProduct.mutateAsync(productId);
        toast.success("Producto eliminado con éxito.");
        navigate('/management/products');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(message, { duration: 7000 });
      }
    }
  };

  if (isLoading) return <div>Cargando detalles del producto...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!product) return <div>Producto no encontrado.</div>;

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/management/products')} className={styles.backButton}>
        <i className='bx bx-arrow-back'></i> Volver a Productos
      </button>

      <div className={styles.header}>
        <h1>{product.name}</h1>
        <div className={styles.actions}>
          <button onClick={handleOpenEditModal} className={styles.editButton}>
            <i className='bx bx-pencil'></i> Editar
          </button>
          {storeLinks.length > 0 && (
            <button
              onClick={handleToggleAll}
              className={styles.toggleAllButton}
              disabled={setActive.isPending}
            >
              <i className={allActive ? 'bx bx-hide' : 'bx bx-show'}></i>
              {allActive ? 'Ocultar en todas' : 'Mostrar en todas'}
            </button>
          )}
          <button onClick={handleDelete} className={styles.deleteButton}>
            <i className='bx bx-trash'></i> Eliminar
          </button>
        </div>
      </div>

      <div className={styles.productDetails}>
        <div className={styles.imageContainer}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className={styles.productImage} />
          ) : (
            <div className={styles.productImagePlaceholder}>
              <i className='bx bx-image'></i>
            </div>
          )}
        </div>
        <div className={styles.info}>
          <p><strong>Categoría:</strong> {product.categories?.name || 'Sin categoría'}</p>
          <p><strong>Descripción:</strong> {product.description || 'Sin descripción'}</p>
        </div>
      </div>

      <div className={styles.pricesHeader}>
        <h2>Precios por Tienda</h2>
        {storeLinks.length > 0 && (
          <span className={styles.pricesSummary}>
            Visible en el POS de {activeCount} de {storeLinks.length} {storeLinks.length === 1 ? 'tienda' : 'tiendas'}
          </span>
        )}
      </div>

      {storeLinks.length === 0 ? (
        <p className={styles.noPrices}>Este producto no está disponible en ninguna tienda o no tiene precios asignados.</p>
      ) : (
        <table className={styles.pricesTable}>
          <thead>
            <tr>
              <th>Tienda</th>
              <th>Precio</th>
              <th>Punto de Venta</th>
            </tr>
          </thead>
          <tbody>
            {storeLinks.map((link) => {
              const storeName = link.stores?.name || 'Tienda Desconocida';
              return (
                <tr key={link.store_id} className={link.is_active ? undefined : styles.rowInactive}>
                  <td>{storeName}</td>
                  <td>{formatCurrency(link.price)}</td>
                  <td>
                    <Switch
                      checked={link.is_active}
                      onChange={(checked) => handleToggleStore(link.store_id, storeName, checked)}
                      disabled={setActive.isPending}
                      label={link.is_active ? 'Visible' : 'Oculto'}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Editar ${product.name}`}>
        <ProductForm productToEdit={product} onFormSubmit={handleProductSaved} />
      </Modal>
    </div>
  );
};