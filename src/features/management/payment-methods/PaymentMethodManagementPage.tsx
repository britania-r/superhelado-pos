// src/features/management/payment-methods/PaymentMethodManagementPage.tsx

import { useState } from 'react';
import toast from 'react-hot-toast';
import { usePaymentMethods, useDeletePaymentMethod } from '../../../hooks/queries';
import type { PaymentMethod } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { PaymentMethodForm } from './components/PaymentMethodForm';
import styles from './PaymentMethodManagementPage.module.css';

const COLUMNS: DataTableColumn<PaymentMethod>[] = [
  {
    key: 'name',
    header: 'Nombre',
    width: '32%',
    strong: true,
    mobile: 'title',
    render: (method) => method.name,
  },
  {
    key: 'description',
    header: 'Descripción',
    muted: true,
    mobile: 'subtitle',
    render: (method) =>
      method.description || <span className={styles.placeholder}>Sin descripción</span>,
  },
];

/* Si el método ya se usó en ventas, Postgres lo impide (y responde en inglés) */
const deleteErrorMessage = (err: unknown) => {
  const message = err instanceof Error ? err.message : 'Error desconocido';
  return message.includes('foreign key')
    ? 'tiene ventas registradas y no se puede eliminar.'
    : message;
};

export const PaymentMethodManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);

  const { data: paymentMethods = [], isLoading, error, refetch } = usePaymentMethods();
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
    // React Query invalida automáticamente vía el formulario
  };

  const handleConfirmDelete = async () => {
    if (!methodToDelete) return;
    try {
      await deleteMethod.mutateAsync(methodToDelete.id);
      toast.success('Método de pago eliminado con éxito.');
    } catch (err) {
      toast.error(`Error al eliminar: ${deleteErrorMessage(err)}`);
    } finally {
      setMethodToDelete(null);
    }
  };

  const count = paymentMethods.length;
  const subtitle = isLoading
    ? 'Cargando…'
    : `${count} ${count === 1 ? 'método registrado' : 'métodos registrados'}`;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Métodos de pago"
        subtitle={!error && subtitle}
        actions={
          <Button icon="bx-plus" onClick={handleOpenCreateModal} iconOnlyOnMobile>
            Añadir método
          </Button>
        }
      />

      {error ? (
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudieron cargar los métodos de pago"
          description={error.message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Métodos de pago"
          columns={COLUMNS}
          rows={paymentMethods}
          rowKey={(method) => method.id}
          loading={isLoading}
          actions={(method) => (
            <>
              <IconButton
                icon="bx-edit-alt"
                label={`Editar ${method.name}`}
                tooltip="Editar"
                variant="brand"
                size="sm"
                onClick={() => handleOpenEditModal(method)}
              />
              <IconButton
                icon="bx-trash"
                label={`Eliminar ${method.name}`}
                tooltip="Eliminar"
                variant="danger"
                size="sm"
                onClick={() => setMethodToDelete(method)}
              />
            </>
          )}
          empty={
            <EmptyState
              icon="bx-credit-card"
              title="Aún no hay métodos de pago"
              description="Agrega los métodos con los que cobras, como efectivo, tarjeta o Yape."
              action={
                <Button icon="bx-plus" onClick={handleOpenCreateModal}>
                  Añadir método
                </Button>
              }
            />
          }
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMethod ? 'Editar método de pago' : 'Nuevo método de pago'}
        description="Así aparece al cobrar en el punto de venta."
      >
        <PaymentMethodForm
          methodToEdit={editingMethod}
          onFormSubmit={handleMethodSaved}
          onClose={handleCloseModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!methodToDelete}
        title="¿Eliminar método de pago?"
        message={
          methodToDelete && (
            <>
              Se eliminará <strong>{methodToDelete.name}</strong>. Esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar"
        tone="danger"
        icon="bx-trash"
        loading={deleteMethod.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setMethodToDelete(null)}
      />
    </div>
  );
};