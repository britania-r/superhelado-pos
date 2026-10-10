// src/features/management/stores/StoreManagementPage.tsx

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useStores, useDeleteStore } from '../../../hooks/queries';
import type { Store } from '../../../types';
import { getDeleteErrorMessage } from '../../../lib/errors';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { StoreForm } from './components/StoreForm';

const COLUMNS: DataTableColumn<Store>[] = [
  {
    key: 'name',
    header: 'Nombre',
    width: '32%',
    strong: true,
    mobile: 'title',
    render: (store) => store.name,
  },
  {
    key: 'address',
    header: 'Dirección',
    muted: true,
    mobile: 'subtitle',
    fallback: 'Sin dirección',
    render: (store) => store.address,
  },
];

export const StoreManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);

  const { data: stores = [], isLoading, error, refetch } = useStores();
  const deleteStore = useDeleteStore();

  const handleOpenCreateModal = () => {
    setEditingStore(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (store: Store) => {
    setEditingStore(store);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
  };

  const handleStoreSaved = (successMessage: string) => {
    handleCloseModal();
    toast.success(successMessage);
  };

  const handleConfirmDelete = async () => {
    if (!storeToDelete) return;
    try {
      await deleteStore.mutateAsync(storeToDelete.id);
      toast.success('Tienda eliminada con éxito.');
    } catch (err) {
      toast.error(getDeleteErrorMessage(err, storeToDelete.name));
    } finally {
      setStoreToDelete(null);
    }
  };

  const count = stores.length;
  const subtitle = isLoading
    ? 'Cargando…'
    : `${count} ${count === 1 ? 'tienda registrada' : 'tiendas registradas'}`;

  return (
    <div>
      <PageHeader
        title="Tiendas"
        subtitle={!error && subtitle}
        actions={
          <Button icon="bx-plus" onClick={handleOpenCreateModal} iconOnlyOnMobile>
            Añadir tienda
          </Button>
        }
      />

      {error ? (
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudieron cargar las tiendas"
          description={error.message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Tiendas"
          columns={COLUMNS}
          rows={stores}
          rowKey={(store) => store.id}
          loading={isLoading}
          actions={(store) => (
            <>
              <IconButton
                icon="bx-pencil"
                label={`Editar ${store.name}`}
                tooltip="Editar"
                variant="brand"
                size="sm"
                onClick={() => handleOpenEditModal(store)}
              />
              <IconButton
                icon="bx-trash"
                label={`Eliminar ${store.name}`}
                tooltip="Eliminar"
                variant="danger"
                size="sm"
                onClick={() => setStoreToDelete(store)}
              />
            </>
          )}
          empty={
            <EmptyState
              icon="bx-store-alt"
              title="Aún no hay tiendas"
              description="Crea tu primera tienda para asignarle vendedores y precios."
              action={
                <Button icon="bx-plus" onClick={handleOpenCreateModal}>
                  Añadir tienda
                </Button>
              }
            />
          }
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStore ? 'Editar tienda' : 'Nueva tienda'}
        description="Cada tienda tiene sus propios vendedores y precios."
      >
        <StoreForm
          storeToEdit={editingStore}
          onFormSubmit={handleStoreSaved}
          onClose={handleCloseModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!storeToDelete}
        title="¿Eliminar tienda?"
        message={
          storeToDelete && (
            <>
              Se eliminará <strong>{storeToDelete.name}</strong>. Esta acción no se puede deshacer
              y podría afectar a los usuarios y ventas asociados.
            </>
          )
        }
        confirmLabel="Eliminar"
        tone="danger"
        icon="bx-trash"
        loading={deleteStore.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setStoreToDelete(null)}
      />
    </div>
  );
};