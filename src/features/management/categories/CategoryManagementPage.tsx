// src/features/management/categories/CategoryManagementPage.tsx

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCategories, useDeleteCategory } from '../../../hooks/queries';
import type { Category } from '../../../types';
import { getDeleteErrorMessage } from '../../../lib/errors';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { CategoryForm } from './components/CategoryForm';

const COLUMNS: DataTableColumn<Category>[] = [
  {
    key: 'name',
    header: 'Nombre',
    strong: true,
    mobile: 'title',
    render: (category) => category.name,
  },
];

export const CategoryManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const { data: categories = [], isLoading, error, refetch } = useCategories();
  const deleteCategory = useDeleteCategory();

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleCategorySaved = () => {
    handleCloseModal();
    toast.success('Categoría guardada con éxito!');
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory.mutateAsync(categoryToDelete.id);
      toast.success('Categoría eliminada con éxito.');
    } catch (err) {
      toast.error(getDeleteErrorMessage(err, categoryToDelete.name));
    } finally {
      setCategoryToDelete(null);
    }
  };

  const count = categories.length;
  const subtitle = isLoading
    ? 'Cargando…'
    : `${count} ${count === 1 ? 'categoría registrada' : 'categorías registradas'}`;

  return (
    <div>
      <PageHeader
        title="Categorías"
        subtitle={!error && subtitle}
        actions={
          <Button icon="bx-plus" onClick={handleOpenCreateModal} iconOnlyOnMobile>
            Añadir categoría
          </Button>
        }
      />

      {error ? (
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudieron cargar las categorías"
          description={error.message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Categorías"
          columns={COLUMNS}
          rows={categories}
          rowKey={(category) => category.id}
          loading={isLoading}
          actions={(category) => (
            <>
              <IconButton
                icon="bx-pencil"
                label={`Editar ${category.name}`}
                tooltip="Editar"
                variant="brand"
                size="sm"
                onClick={() => handleOpenEditModal(category)}
              />
              <IconButton
                icon="bx-trash"
                label={`Eliminar ${category.name}`}
                tooltip="Eliminar"
                variant="danger"
                size="sm"
                onClick={() => setCategoryToDelete(category)}
              />
            </>
          )}
          empty={
            <EmptyState
              icon="bx-category"
              title="Aún no hay categorías"
              description="Agrupa tus productos, por ejemplo: helados, paletas o bebidas."
              action={
                <Button icon="bx-plus" onClick={handleOpenCreateModal}>
                  Añadir categoría
                </Button>
              }
            />
          }
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Editar categoría' : 'Nueva categoría'}
        description="Agrupa tus productos para encontrarlos más rápido."
        size="sm"
      >
        <CategoryForm
          categoryToEdit={editingCategory}
          onFormSubmit={handleCategorySaved}
          onClose={handleCloseModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="¿Eliminar categoría?"
        message={
          categoryToDelete && (
            <>
              Se eliminará <strong>{categoryToDelete.name}</strong>. Esta acción no se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar"
        tone="danger"
        icon="bx-trash"
        loading={deleteCategory.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
};