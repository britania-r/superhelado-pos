// src/features/management/products/ProductManagementPage.tsx

import { useState, useMemo } from 'react';
import { useProducts, useStores, useDeleteProduct } from '../../../hooks/queries';
import type { ProductWithDetails } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { ProductForm } from './components/ProductForm';
import { formatCurrency } from '../../../lib/formatters';
import styles from './ProductManagementPage.module.css';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PRODUCTS_PER_PAGE = 30;

type StatusFilter = 'all' | 'visible' | 'hidden';

/* ¿Se ve en el POS? En la tienda filtrada, o en al menos una tienda */
const isVisibleInPos = (product: ProductWithDetails, storeId: string | null) =>
  storeId === null
    ? product.store_products.some((sp) => sp.is_active)
    : product.store_products.some((sp) => sp.store_id === storeId && sp.is_active);

/* ¿Está oculto? En la tienda filtrada, o en al menos una tienda (o sin tiendas) */
const isHiddenInPos = (product: ProductWithDetails, storeId: string | null) =>
  storeId === null
    ? product.store_products.length === 0 || product.store_products.some((sp) => !sp.is_active)
    : product.store_products.some((sp) => sp.store_id === storeId && !sp.is_active);

export const ProductManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const navigate = useNavigate();

  const { data: allProducts = [], isLoading, error } = useProducts();
  const { data: stores = [] } = useStores();
  const deleteProduct = useDeleteProduct();

  const filteredAndSearchedProducts = useMemo(() => {
    const lower = searchTerm.toLowerCase();

    return allProducts.filter((product) => {
      const matchesStore = selectedStoreFilter === null || product.store_products.some(
        (sp) => sp.store_id === selectedStoreFilter
      );
      if (!matchesStore) return false;

      if (statusFilter === 'visible' && !isVisibleInPos(product, selectedStoreFilter)) return false;
      if (statusFilter === 'hidden' && !isHiddenInPos(product, selectedStoreFilter)) return false;

      return product.name.toLowerCase().includes(lower) ||
        (product.description?.toLowerCase().includes(lower) ?? false);
    });
  }, [allProducts, searchTerm, selectedStoreFilter, statusFilter]);

  const totalPages = useMemo(() => Math.ceil(filteredAndSearchedProducts.length / PRODUCTS_PER_PAGE), [filteredAndSearchedProducts.length]);

  // Si la lista se achica (filtro o borrado), no quedarse en una página vacía
  const page = Math.min(currentPage, Math.max(totalPages, 1));

  const currentProducts = useMemo(() => {
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    return filteredAndSearchedProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredAndSearchedProducts, page]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditPage = (productId: string) => {
    navigate(`/management/products/${productId}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleProductSaved = () => {
    handleCloseModal();
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await deleteProduct.mutateAsync(productId);
        toast.success("Producto eliminado con éxito.");
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(message, { duration: 7000 });
      }
    }
  };

  /* Columna "Precios": con una tienda filtrada muestra su precio y estado;
     con "Todas las Tiendas" muestra cuántas tiendas tiene y cuántas están ocultas */
  const renderPriceCell = (product: ProductWithDetails) => {
    if (selectedStoreFilter) {
      const link = product.store_products.find((sp) => sp.store_id === selectedStoreFilter);
      if (!link) return null;

      return (
        <div className={styles.priceCell}>
          <button className={styles.viewPricesButton} onClick={() => handleOpenEditPage(product.id)}>
            {formatCurrency(link.price)}
          </button>
          <span className={`${styles.statusPill} ${link.is_active ? styles.statusPillActive : styles.statusPillInactive}`}>
            {link.is_active ? 'Visible' : 'Oculto'}
          </span>
        </div>
      );
    }

    const total = product.store_products.length;
    const hiddenCount = product.store_products.filter((sp) => !sp.is_active).length;

    return (
      <div className={styles.priceCell}>
        <button className={styles.viewPricesButton} onClick={() => handleOpenEditPage(product.id)}>
          Ver Precios ({total})
        </button>
        {hiddenCount > 0 && (
          <span
            className={`${styles.statusPill} ${styles.statusPillInactive}`}
            title={`Oculto en el POS de ${hiddenCount} de ${total} tiendas`}
          >
            {hiddenCount === 1 ? '1 oculta' : `${hiddenCount} ocultas`}
          </span>
        )}
      </div>
    );
  };

  if (isLoading) return <div>Cargando productos...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gestión de Productos</h1>
        <div className={styles.controls}>
          <select
            className={styles.storeFilter}
            value={selectedStoreFilter ?? ''}
            onChange={(e) => {
              setSelectedStoreFilter(e.target.value === '' ? null : e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Todas las Tiendas</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <select
            className={styles.storeFilter}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="visible">Visibles en POS</option>
            <option value="hidden">Ocultos en POS</option>
          </select>
          <input
            type="search"
            placeholder="Buscar producto..."
            className={styles.searchBar}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button onClick={handleOpenCreateModal} className={styles.addButton}>
          <i className='bx bx-plus'></i> Añadir Producto
        </button>
      </div>

      {totalPages > 1 && (
        <div className={styles.paginationTop}>
          <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className={styles.paginationButton}>
            <i className='bx bx-chevron-left'></i>
          </button>
          <span>Página {page} de {totalPages}</span>
          <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className={styles.paginationButton}>
            <i className='bx bx-chevron-right'></i>
          </button>
        </div>
      )}

      {currentProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No se encontraron productos con los filtros aplicados.</p>
          <p>Intenta ajustar la búsqueda o los filtros.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precios</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map(product => (
              <tr key={product.id}>
                <td>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className={styles.productImage} />
                  ) : (
                    <div className={styles.productImagePlaceholder}>
                      <i className='bx bx-image'></i>
                    </div>
                  )}
                </td>
                <td>{product.name}</td>
                <td>{product.categories?.name || 'Sin categoría'}</td>
                <td>{renderPriceCell(product)}</td>
                <td className={styles.actions}>
                  <button onClick={() => handleOpenEditPage(product.id)} className={styles.actionButton}>
                    <i className='bx bx-pencil'></i>
                  </button>
                  <button onClick={() => handleDelete(product.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                    <i className='bx bx-trash'></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? "Editar Producto" : "Crear Nuevo Producto"}>
        <ProductForm productToEdit={editingProduct} onFormSubmit={handleProductSaved} />
      </Modal>
    </div>
  );
};