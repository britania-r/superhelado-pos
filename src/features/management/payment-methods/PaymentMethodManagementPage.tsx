// src/features/management/payment-methods/PaymentMethodManagementPage.tsx

import { useState } from 'react';
import { usePaymentMethods, useDeletePaymentMethod } from '../../../hooks/queries';
import type { PaymentMethod } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { PaymentMethodForm } from './components/PaymentMethodForm';
import toast from 'react-hot-toast';
import styles from './PaymentMethodManagementPage.module.css';

export const PaymentMethodManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  const { data: paymentMethods = [], isLoading, error } = usePaymentMethods();
  const deleteMethod = useDeletePaymentMethod();

  const handleOpenCreateModal = () => {
    setEditingMethod(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
  };

  const handleMethodSaved = (successMessage: string) => {
    handleCloseModal();
    toast.success(successMessage);
    // React Query invalida automáticamente via el hook del form
  };

  const handleDelete = async (methodId: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este método de pago?")) {
      try {
        await deleteMethod.mutateAsync(methodId);
        toast.success("Método de pago eliminado con éxito.");
      } catch (err: any) {
        toast.error(`Error al eliminar: ${err.message}`);
      }
    }
  };

  if (isLoading) return <div>Cargando métodos de pago...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gestión de Métodos de Pago</h1>
        <button onClick={handleOpenCreateModal} className={styles.addButton}>
          <i className='bx bx-plus'></i> Añadir Método
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No hay métodos de pago registrados.</p>
          <p>Haz clic en "Añadir Método" para empezar.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map(method => (
              <tr key={method.id}>
                <td>{method.name}</td>
                <td>{method.description || 'N/A'}</td>
                <td className={styles.actions}>
                  <button onClick={() => handleOpenEditModal(method)} className={styles.actionButton}>
                    <i className='bx bx-pencil'></i>
                  </button>
                  <button onClick={() => handleDelete(method.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                    <i className='bx bx-trash'></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMethod ? "Editar Método de Pago" : "Crear Nuevo Método de Pago"}
      >
        <PaymentMethodForm
          methodToEdit={editingMethod}
          onFormSubmit={handleMethodSaved}
          onClose={handleCloseModal}
        />
      </Modal>
    </div>
  );
};