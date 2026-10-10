// src/features/management/stores/StoreManagementPage.tsx

import { useState } from 'react';
import { useStores, useDeleteStore } from '../../../hooks/queries';
import type { Store } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { StoreForm } from './components/StoreForm';
import toast from 'react-hot-toast';
import styles from './StoreManagementPage.module.css';

export const StoreManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const { data: stores = [], isLoading, error } = useStores();
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

  const handleDeleteStore = async (id: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta tienda? Eliminarla podría afectar a usuarios y ventas asociadas.")) {
      try {
        await deleteStore.mutateAsync(id);
        toast.success("Tienda eliminada con éxito.");
      } catch (err: any) {
        toast.error(`Error al eliminar la tienda: ${err.message}`);
      }
    }
  };

  if (isLoading) return <div>Cargando tiendas...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gestión de Tiendas</h1>
        <button onClick={handleOpenCreateModal} className={styles.addButton}>
          <i className='bx bx-plus'></i> Añadir Tienda
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer} style={{ width: '100%' }}>
          <h3>Tiendas Existentes</h3>
          {stores.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay tiendas creadas.</p>
              <p>Haz clic en "Añadir Tienda" para empezar.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id}>
                    <td>{store.name}</td>
                    <td>{store.address || 'N/A'}</td>
                    <td className={styles.actions}>
                      <button onClick={() => handleOpenEditModal(store)} className={styles.actionButton}>
                        <i className='bx bx-pencil'></i>
                      </button>
                      <button onClick={() => handleDeleteStore(store.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                        <i className='bx bx-trash'></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStore ? "Editar Tienda" : "Crear Nueva Tienda"}>
        <StoreForm storeToEdit={editingStore} onFormSubmit={handleStoreSaved} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};