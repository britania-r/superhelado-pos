import { useState } from 'react';
import type { Profile } from '../../../types';
import { useStores, useProfiles, useDeleteUser } from '../../../hooks/queries';
import { Modal } from '../../../components/ui/Modal';
import { UserForm } from './components/UserForm';
import styles from './UserManagementPage.module.css';
import toast from 'react-hot-toast';

export const UserManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const { data: users = [], isLoading, error } = useProfiles();
  const { data: stores = [] } = useStores();
  const deleteUser = useDeleteUser();

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: Profile) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleUserSaved = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    // No necesitas fetchUsersAndStores() — react-query invalida automáticamente
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible.")) {
      try {
        await deleteUser.mutateAsync(userId);
        toast.success("Usuario eliminado con éxito.");
      } catch (err: any) {
        toast.error(`Error al eliminar el usuario: ${err.message}`);
      }
    }
  };

  if (isLoading) return <div className={styles.loadingState}>Cargando usuarios...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gestión de Usuarios</h1>
        <button onClick={handleOpenCreateModal} className={styles.addButton}>
          <i className='bx bx-user-plus'></i> Añadir Usuario
        </button>
      </div>

      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No hay usuarios registrados.</p>
          <p>Haz clic en "Añadir Usuario" para empezar.</p>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Tienda Asignada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {user.store_id
                    ? stores.find(s => s.id === user.store_id)?.name || 'Desconocida'
                    : (user.role === 'admin' ? 'Global' : 'Sin asignar')
                  }
                </td>
                <td className={styles.actions}>
                  <button onClick={() => handleOpenEditModal(user)} className={styles.actionButton}>
                    <i className='bx bx-pencil'></i>
                  </button>
                  <button onClick={() => handleDeleteUser(user.id)} className={`${styles.actionButton} ${styles.deleteButton}`}>
                    <i className='bx bx-trash'></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Editar Usuario" : "Añadir Nuevo Usuario"}>
        <UserForm
          userToEdit={editingUser}
          onUserSaved={handleUserSaved}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};