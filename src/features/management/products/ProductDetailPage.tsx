// src/features/management/products/ProductDetailPage.tsx

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProductDetails, useDeleteProduct, useSetStoreProductActive } from '../../../hooks/queries';
import { formatCurrency } from '../../../lib/formatters';
import { getErrorMessage } from '../../../lib/errors';
import { cx } from '../../../lib/cx';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { Switch } from '../../../components/ui/Switch';
import { Thumbnail } from '../../../components/ui/Thumbnail';
import { ProductForm } from './components/ProductForm';
import styles from './ProductDetailPage.module.css';

export const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmToggleAll, setConfirmToggleAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: product, isLoading, error, refetch } = useProductDetails(productId);
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

  const goBack = () => navigate('/management/products');
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
    setConfirmToggleAll(false);
    if (!productId || storeLinks.length === 0) return;

    const nextActive = !allActive;
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
    try {
      await deleteProduct.mutateAsync(productId);
      toast.success('Producto eliminado con éxito.');
      navigate('/management/products');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setConfirmDelete(false);
    }
  };

  const backButton = (
    <Button variant="ghost" size="sm" icon="bx-arrow-back" onClick={goBack} className={styles.back}>
      Productos
    </Button>
  );

  if (isLoading) {
    return (
      <div>
        {backButton}
        <div className={styles.loading}>
          <Spinner size="lg" label="" />
          <p>Cargando producto…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {backButton}
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudo cargar el producto"
          description={error.message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        {backButton}
        <EmptyState
          icon="bx-package"
          title="Producto no encontrado"
          description="Puede que lo hayan eliminado."
          action={
            <Button variant="secondary" icon="bx-arrow-back" onClick={goBack}>
              Volver a productos
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {backButton}

      <PageHeader
        title={product.name}
        subtitle={product.categories?.name || 'Sin categoría'}
        actions={
          <>
            <Button variant="secondary" icon="bx-pencil" onClick={handleOpenEditModal} iconOnlyOnMobile>
              Editar
            </Button>
            {storeLinks.length > 0 && (
              <Button
                variant="secondary"
                icon={allActive ? 'bx-hide' : 'bx-show'}
                onClick={() => setConfirmToggleAll(true)}
                disabled={setActive.isPending}
                iconOnlyOnMobile
              >
                {allActive ? 'Ocultar en todas' : 'Mostrar en todas'}
              </Button>
            )}
            <Button variant="danger" icon="bx-trash" onClick={() => setConfirmDelete(true)} iconOnlyOnMobile>
              Eliminar
            </Button>
          </>
        }
      />

      <div className={styles.layout}>
        {/* ── Imagen e información ── */}
        <section className={cx(styles.card, styles.summary)} aria-label="Información del producto">
          <Thumbnail src={product.image_url} alt={product.name} size="fill" className={styles.image} />
          <dl className={styles.info}>
            <div>
              <dt>Categoría</dt>
              <dd>{product.categories?.name || <span className={styles.empty}>Sin categoría</span>}</dd>
            </div>
            <div>
              <dt>Descripción</dt>
              <dd>{product.description || <span className={styles.empty}>Sin descripción</span>}</dd>
            </div>
          </dl>
        </section>

        {/* ── Precios por tienda ── */}
        <section className={cx(styles.card, styles.prices)} aria-labelledby="prices-title">
          <header className={styles.pricesHeader}>
            <h2 id="prices-title" className={styles.pricesTitle}>Precios por tienda</h2>
            {storeLinks.length > 0 && (
              <Badge tone={activeCount === 0 ? 'neutral' : allActive ? 'success' : 'warning'} icon="bx-show">
                Visible en {activeCount} de {storeLinks.length}{' '}
                {storeLinks.length === 1 ? 'tienda' : 'tiendas'}
              </Badge>
            )}
          </header>

          {storeLinks.length === 0 ? (
            <p className={styles.noPrices}>
              Este producto no está disponible en ninguna tienda o no tiene precios asignados.
            </p>
          ) : (
            <ul className={styles.storeList}>
              {storeLinks.map((link) => {
                const storeName = link.stores?.name || 'Tienda desconocida';
                return (
                  <li
                    key={link.store_id}
                    className={cx(styles.storeRow, !link.is_active && styles.storeRowInactive)}
                  >
                    <span className={styles.storeIcon} aria-hidden="true">
                      <i className="bx bx-store-alt" />
                    </span>
                    <span className={styles.storeText}>
                      <span className={styles.storeName}>{storeName}</span>
                      <span className={styles.storeHint}>
                        {link.is_active ? 'Visible en punto de venta' : 'Oculto en punto de venta'}
                      </span>
                    </span>
                    <span className={styles.storePrice}>{formatCurrency(link.price)}</span>
                    <Switch
                      checked={link.is_active}
                      onChange={(checked) => handleToggleStore(link.store_id, storeName, checked)}
                      disabled={setActive.isPending}
                      ariaLabel={`Visible en el punto de venta de ${storeName}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`Editar ${product.name}`}
        description="Precio y visibilidad se configuran por tienda."
        size="lg"
      >
        <ProductForm productToEdit={product} onFormSubmit={handleProductSaved} onCancel={handleCloseModal} />
      </Modal>

      <ConfirmDialog
        isOpen={confirmToggleAll}
        title={allActive ? '¿Ocultar en todas las tiendas?' : '¿Mostrar en todas las tiendas?'}
        message={
          allActive
            ? 'Este producto dejará de aparecer en el punto de venta de todas sus tiendas. Conserva sus precios.'
            : 'Este producto aparecerá en el punto de venta de todas sus tiendas.'
        }
        confirmLabel={allActive ? 'Ocultar en todas' : 'Mostrar en todas'}
        icon={allActive ? 'bx-hide' : 'bx-show'}
        onConfirm={handleToggleAll}
        onCancel={() => setConfirmToggleAll(false)}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="¿Eliminar producto?"
        message={
          <>
            Se eliminará <strong>{product.name}</strong> con sus precios en todas las tiendas. Esta
            acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        tone="danger"
        icon="bx-trash"
        loading={deleteProduct.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};