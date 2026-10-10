// src/features/management/users/UserManagementPage.tsx

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Profile } from '../../../types';
import { useStores, useProfiles, useDeleteUser } from '../../../hooks/queries';
import { getDeleteErrorMessage } from '../../../lib/errors';
import { ROLE_LABELS } from '../../../lib/labels';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { UserForm } from './components/UserForm';
import styles from './UserManagementPage.module.css';

const displayName = (user: Profile) => user.full_name || user.email || 'Sin nombre';

/* Avatar, nombre y correo en una sola celda (en celular es el título de la tarjeta) */
const UserCell = ({ user }: { user: Profile }) => (
  <span className={styles.userCell}>
    <Avatar name={displayName(user)} />
    <span className={styles.userText}>
      <span className={styles.userName}>{displayName(user)}</span>
      {user.email && <span className={styles.userEmail}>{user.email}</span>}
    </span>
  </span>
);

export const UserManagementPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

  const { data: users = [], isLoading, error, refetch } = useProfiles();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const deleteUser = useDeleteUser();

  const columns = useMemo<DataTableColumn<Profile>[]>(() => {
    const storeNames = new Map(stores.map((store) => [store.id, store.name]));

    const renderStore = (user: Profile) => {
      if (user.store_id) return storeNames.get(user.store_id) ?? 'Desconocida';
      if (user.role === 'admin') return <span className={styles.muted}>Todas las tiendas</span>;
      return <Badge tone="warning" icon="bx-error">Sin asignar</Badge>;
    };

    return [
      {
        key: 'user',
        header: 'Usuario',
        width: '42%',
        mobile: 'title',
        render: (user) => <UserCell user={user} />,
      },
      {
        key: 'role',
        header: 'Rol',
        render: (user) => (
          <Badge
            tone={user.role === 'admin' ? 'brand' : 'accent'}
            icon={user.role === 'admin' ? 'bx-shield-quarter' : 'bx-user'}
          >
            {ROLE_LABELS[user.role]}
          </Badge>
        ),
      },
      {
        key: 'store',
        header: 'Tienda',
        render: renderStore,
      },
    ];
  }, [stores]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: Profile) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser.mutateAsync(userToDelete.id);
      toast.success('Usuario eliminado con éxito.');
    } catch (err) {
      toast.error(getDeleteErrorMessage(err, displayName(userToDelete)));
    } finally {
      setUserToDelete(null);
    }
  };

  const count = users.length;
  const subtitle = isLoading
    ? 'Cargando…'
    : `${count} ${count === 1 ? 'usuario registrado' : 'usuarios registrados'}`;

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle={!error && subtitle}
        actions={
          <Button icon="bx-user-plus" onClick={handleOpenCreateModal} iconOnlyOnMobile>
            Añadir usuario
          </Button>
        }
      />

      {error ? (
        <EmptyState
          tone="danger"
          icon="bx-error-circle"
          title="No se pudieron cargar los usuarios"
          description={error.message}
          action={
            <Button variant="secondary" icon="bx-refresh" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Usuarios"
          columns={columns}
          rows={users}
          rowKey={(user) => user.id}
          loading={isLoading || storesLoading}
          actions={(user) => (
            <>
              <IconButton
                icon="bx-pencil"
                label={`Editar ${displayName(user)}`}
                tooltip="Editar"
                variant="brand"
                size="sm"
                onClick={() => handleOpenEditModal(user)}
              />
              <IconButton
                icon="bx-trash"
                label={`Eliminar ${displayName(user)}`}
                tooltip="Eliminar"
                variant="danger"
                size="sm"
                onClick={() => setUserToDelete(user)}
              />
            </>
          )}
          empty={
            <EmptyState
              icon="bx-group"
              title="Aún no hay usuarios"
              description="Crea las cuentas de tus vendedores y asígnales una tienda."
              action={
                <Button icon="bx-user-plus" onClick={handleOpenCreateModal}>
                  Añadir usuario
                </Button>
              }
            />
          }
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
        description={
          editingUser
            ? 'Cambia el nombre, el rol o la tienda asignada.'
            : 'Podrá ingresar con este correo y la contraseña temporal.'
        }
      >
        <UserForm
          userToEdit={editingUser}
          onUserSaved={handleCloseModal}
          onClose={handleCloseModal}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!userToDelete}
        title="¿Eliminar usuario?"
        message={
          userToDelete && (
            <>
              Se eliminará la cuenta de <strong>{displayName(userToDelete)}</strong>. Esta acción no
              se puede deshacer.
            </>
          )
        }
        confirmLabel="Eliminar"
        tone="danger"
        icon="bx-trash"
        loading={deleteUser.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};