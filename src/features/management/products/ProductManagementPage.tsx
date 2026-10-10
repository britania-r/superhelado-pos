// src/features/management/products/ProductManagementPage.tsx

import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProducts, useStores, useDeleteProduct } from '../../../hooks/queries';
import type { ProductWithDetails } from '../../../types';
import { formatCurrency } from '../../../lib/formatters';
import { getErrorMessage } from '../../../lib/errors';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect, type SelectOption } from '../../../components/ui/SearchableSelect';
import { SegmentedControl, type SegmentedOption } from '../../../components/ui/SegmentedControl';
import { Pagination } from '../../../components/ui/Pagination';
import { Badge } from '../../../components/ui/Badge';
import { Thumbnail } from '../../../components/ui/Thumbnail';
import { ProductForm } from './components/ProductForm';
import styles from './ProductManagementPage.module.css';

const PRODUCTS_PER_PAGE = 30;

type StatusFilter = 'all' | 'visible' | 'hidden';

/* Valor de "Todas las tiendas" en el selector (los ids de tienda son UUID) */
const ALL_STORES = 'all';

const STATUS_OPTIONS: SegmentedOption<StatusFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'visible', label: 'Visibles', icon: 'bx-show' },
  { value: 'hidden', label: 'Ocultos', icon: 'bx-hide' },
];

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

/* "S/ 4.50" o "S/ 4.50 – S/ 6.00" si cambia entre tiendas */
const formatPriceRange = (prices: number[]) => {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

export const ProductManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductWithDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const listTopRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const { data: allProducts = [], isLoading, error, refetch } = useProducts();
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
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // La paginación está abajo: vuelve al inicio de la lista
      listTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  const hasFilters = searchTerm !== '' || selectedStoreFilter !== null || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStoreFilter(null);
    setStatusFilter('all');
    setCurrentPage(1);
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

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      toast.success('Producto eliminado con éxito.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProductToDelete(null);
    }
  };

  const storeOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_STORES, label: 'Todas las tiendas', icon: 'bx-buildings' },
      ...stores.map((store) => ({ value: store.id, label: store.name, icon: 'bx-store-alt' })),
    ],
    [stores]
  );

  const columns = useMemo<DataTableColumn<ProductWithDetails>[]>(() => {
    /* Precio: con una tienda filtrada, su precio y estado;
       con "Todas las tiendas", el rango de precios y cuántas están ocultas */
    const renderPriceCell = (product: ProductWithDetails) => {
      if (selectedStoreFilter) {
        const link = product.store_products.find((sp) => sp.store_id === selectedStoreFilter);
        if (!link) return null;
        return (
          <span className={styles.priceCell}>
            <span className={styles.price}>{formatCurrency(link.price)}</span>
            {link.is_active ? (
              <Badge tone="success" icon="bx-show">Visible</Badge>
            ) : (
              <Badge tone="neutral" icon="bx-hide">Oculto</Badge>
            )}
          </span>
        );
      }

      const total = product.store_products.length;
      if (total === 0) return <span className={styles.noPrice}>Sin tiendas</span>;
      const hiddenCount = product.store_products.filter((sp) => !sp.is_active).length;

      return (
        <span className={styles.priceCell}>
          <span className={styles.priceText}>
            <span className={styles.price}>
              {formatPriceRange(product.store_products.map((sp) => sp.price))}
            </span>
            <span className={styles.storeCount}>
              {total === 1 ? '1 tienda' : `${total} tiendas`}
            </span>
          </span>
          {hiddenCount > 0 && (
            <span title={`Oculto en el POS de ${hiddenCount} de ${total} tiendas`}>
              <Badge tone="warning" icon="bx-hide">
                {hiddenCount === 1 ? '1 oculta' : `${hiddenCount} ocultas`}
              </Badge>
            </span>
          )}
        </span>
      );
    };

    return [
      {
        key: 'product',
        header: 'Producto',
        width: '40%',
        mobile: 'title',
        render: (product) => (
          <span className={styles.productCell}>
            <Thumbnail src={product.image_url} alt="" />
            <button
              type="button"
              className={styles.productName}
              onClick={() => navigate(`/management/products/${product.id}`)}
            >
              {product.name}
            </button>
          </span>
        ),
      },
      {
        key: 'category',
        header: 'Categoría',
        muted: true,
        fallback: 'Sin categoría',
        render: (product) => product.categories?.name,
      },
      {
        key: 'price',
        header: 'Precio',
        render: renderPriceCell,
      },
    ];
  }, [selectedStoreFilter, navigate]);

  const count = allProducts.length;
  const subtitle = isLoading
    ? 'Cargando…'
    : hasFilters
      ? `${filteredAndSearchedProducts.length} de ${count} productos`
      : `${count} ${count === 1 ? 'producto registrado' : 'productos registrados'}`;

  return (
    <div>
      <PageHeader
        title="Productos"
        subtitle={!error && subtitle}
        actions={
          <Button icon="bx-plus" onClick={handleOpenCreateModal} iconOnlyOnMobile>
            Añadir producto
          </Button>
        }
      />

      <div className={styles.toolbar} ref={listTopRef}>
        <Input
          type="search"
          icon="bx-search"
          placeholder="Buscar producto…"
          aria-label="Buscar producto"
          className={styles.search}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          onClear={() => {
            setSearchTerm('');
            setCurrentPage(1);
          }}
        />
        <SearchableSelect
          options={storeOptions}
          value={selectedStoreFilter ?? ALL_STORES}
          onChange={(value) => {
            setSelectedStoreFilter(value === ALL_STORES ? null : value);
            setCurrentPage(1);
          }}
          label="Tienda"
          searchPlaceholder="Buscar tienda…"
          emptyMessage="No hay tiendas con ese nombre"
          className={styles.storeFilter}
        />
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
          ariaLabel="Estado en el punto de venta"
          className={styles.statusFilter}
        />
      </div>

      {error ? (
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudieron cargar los productos"
          description={error.message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            caption="Productos"
            columns={columns}
            rows={currentProducts}
            rowKey={(product) => product.id}
            loading={isLoading}
            skeletonRows={6}
            actions={(product) => (
              <>
                <IconButton
                  icon="bx-pencil"
                  label={`Ver y editar ${product.name}`}
                  tooltip="Ver y editar"
                  variant="brand"
                  size="sm"
                  onClick={() => handleOpenEditPage(product.id)}
                />
                <IconButton
                  icon="bx-trash"
                  label={`Eliminar ${product.name}`}
                  tooltip="Eliminar"
                  variant="danger"
                  size="sm"
                  onClick={() => setProductToDelete(product)}
                />
              </>
            )}
            empty={
              hasFilters ? (
                <EmptyState
                  icon="bx-search-alt"
                  title="No se encontraron productos"
                  description="Intenta ajustar la búsqueda o los filtros."
                  action={
                    <Button variant="secondary" icon="bx-x" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon="bx-package"
                  title="Aún no hay productos"
                  description="Crea tu primer producto y asígnale precio en cada tienda."
                  action={
                    <Button icon="bx-plus" onClick={handleOpenCreateModal}>
                      Añadir producto
                    </Button>
                  }
                />
              )
            }
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredAndSearchedProducts.length}
            pageSize={PRODUCTS_PER_PAGE}
          />
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
        description="Precio y visibilidad se configuran por tienda."
        size="lg"
      >
        <ProductForm
          productToEdit={editingProduct}
          onFormSubmit={handleProductSaved}
          onCancel={handleCloseModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!productToDelete}
        title="¿Eliminar producto?"
        message={
          productToDelete && (
            <>
              Se eliminará <strong>{productToDelete.name}</strong> con sus precios en todas las
              tiendas. Esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar"
        tone="danger"
        icon="bx-trash"
        loading={deleteProduct.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};