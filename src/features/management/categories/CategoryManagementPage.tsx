// src/features/management/categories/CategoryManagementPage.tsx

import { useState } from 'react';
import { useCategories, useDeleteCategory } from '../../../hooks/queries';
import type { Category } from '../../../types';
import styles from './CategoryManagementPage.module.css';
import { Modal } from '../../../components/ui/Modal';
import { CategoryForm } from './components/CategoryForm';
import toast from 'react-hot-toast';

export const CategoryManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories = [], isLoading, error } = useCategories();
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
    toast.success("Categoría guardada con éxito!");
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta categoría?")) {
      try {
        await deleteCategory.mutateAsync(id);
        toast.success("Categoría eliminada con éxito.");
      } catch (err: any) {
        toast.error(`Error al eliminar la categoría: ${err.message}`);
      }
    }
  };

  if (isLoading) return <div>Cargando categorías...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gestión de Categorías</h1>
        <button onClick={handleOpenCreateModal} className={styles.addButton}>
          <i className='bx bx-plus'></i> Añadir Categoría
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer} style={{ width: '100%' }}>
          <h3>Categorías Existentes</h3>
          {categories.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay categorías creadas.</p>
              <p>Haz clic en "Añadir Categoría" para empezar.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td className={styles.actions}>
                      <button onClick={() => handleOpenEditModal(category)} className={styles.actionButton}>
                        <i className='bx bx-pencil'></i>
                      </button>
                      <button onClick={() => handleDeleteCategory(category.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCategory ? "Editar Categoría" : "Crear Nueva Categoría"}>
        <CategoryForm categoryToEdit={editingCategory} onFormSubmit={handleCategorySaved} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};