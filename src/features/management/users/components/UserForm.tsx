// src/features/management/users/components/UserForm.tsx

import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createNewUser, updateProfile, type CreateUserData, type UpdateProfileData } from '../../../../api/profiles.api';
import { useStores } from '../../../../hooks/queries';
import type { Profile } from '../../../../types';
import { getErrorMessage } from '../../../../lib/errors';
import { ROLE_LABELS } from '../../../../lib/labels';
import { Field } from '../../../../components/ui/Field';
import { Input } from '../../../../components/ui/Input';
import { SearchableSelect, type SelectOption } from '../../../../components/ui/SearchableSelect';
import { Button } from '../../../../components/ui/Button';
import { FormActions } from '../../../../components/ui/FormActions';
import styles from './UserForm.module.css';

interface UserFormData {
  email: string;
  password?: string;
  full_name: string;
  role: 'admin' | 'vendedor' | '';
  store_id?: string | null;
}

interface UserFormProps {
  userToEdit: Profile | null;
  onUserSaved: () => void;
  onClose: () => void;
}

const ROLE_OPTIONS: SelectOption<Profile['role']>[] = [
  {
    value: 'admin',
    label: ROLE_LABELS.admin,
    description: 'Gestiona productos, usuarios y reportes',
    icon: 'bx-shield-quarter',
  },
  {
    value: 'vendedor',
    label: ROLE_LABELS.vendedor,
    description: 'Vende en la tienda que tenga asignada',
    icon: 'bx-user',
  },
];

export const UserForm = ({ userToEdit, onUserSaved, onClose }: UserFormProps) => {
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<UserFormData>();

  const isEditing = !!userToEdit;
  const role = watch('role');

  useEffect(() => {
    if (userToEdit) {
      reset({
        email: userToEdit.email || '',
        full_name: userToEdit.full_name || '',
        role: userToEdit.role,
        store_id: userToEdit.store_id || undefined,
        password: '',
      });
    } else {
      reset({
        email: '',
        full_name: '',
        role: '',
        store_id: undefined,
        password: '',
      });
    }
  }, [userToEdit, reset]);

  const storeOptions = useMemo<SelectOption[]>(
    () =>
      stores.map((store) => ({
        value: store.id,
        label: store.name,
        description: store.address ?? undefined,
        icon: 'bx-store-alt',
      })),
    [stores]
  );

  const onSubmit: SubmitHandler<UserFormData> = async (data) => {
    try {
      if (userToEdit) {
        const updatePayload: UpdateProfileData = {
          full_name: data.full_name,
          role: data.role === 'admin' || data.role === 'vendedor' ? data.role : undefined,
          store_id: data.role === 'admin' ? null : (data.store_id || null),
        };
        await updateProfile(userToEdit.id, updatePayload);
        toast.success('Usuario actualizado con éxito!');
      } else {
        if (!data.password || data.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        if (!data.role) {
          throw new Error('El rol es obligatorio para crear un usuario.');
        }

        const createPayload: CreateUserData = {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          role: data.role,
          store_id: data.role === 'admin' ? null : (data.store_id || null),
        };
        await createNewUser(createPayload);
        toast.success('Usuario creado con éxito!');
      }

      // Refresca la lista de usuarios sin recargar la página
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onUserSaved();
      onClose();
    } catch (err) {
      toast.error(`Error: ${getErrorMessage(err)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
      <div className={styles.grid}>
        <Field
          label="Nombre completo"
          htmlFor="user-full-name"
          error={errors.full_name?.message}
          required
          className={styles.full}
        >
          <Input
            id="user-full-name"
            icon="bx-user"
            placeholder="María Pérez"
            autoComplete="off"
            {...register('full_name', { required: 'El nombre completo es obligatorio' })}
          />
        </Field>

        <Field
          label="Correo electrónico"
          htmlFor="user-email"
          error={errors.email?.message}
          hint={isEditing ? 'El correo no se puede cambiar.' : undefined}
          required={!isEditing}
          className={isEditing ? styles.full : undefined}
        >
          <Input
            id="user-email"
            type="email"
            icon="bx-envelope"
            placeholder="maria@correo.com"
            autoComplete="off"
            disabled={isEditing}
            {...register('email', {
              required: !userToEdit ? 'El correo es obligatorio' : false,
              pattern: !userToEdit ? { value: /^\S+@\S+\.\S+$/, message: 'Correo inválido' } : undefined,
            })}
          />
        </Field>

        {!isEditing && (
          <Field
            label="Contraseña temporal"
            htmlFor="user-password"
            error={errors.password?.message}
            hint="Mínimo 6 caracteres."
            required
          >
            <Input
              id="user-password"
              type="password"
              icon="bx-lock-alt"
              autoComplete="new-password"
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
            />
          </Field>
        )}

        <Field
          label="Rol"
          htmlFor="user-role"
          error={errors.role?.message}
          required
          className={role === 'vendedor' ? undefined : styles.full}
        >
          <Controller
            name="role"
            control={control}
            rules={{ required: 'El rol es obligatorio' }}
            render={({ field }) => (
              <SearchableSelect
                ref={field.ref}
                value={field.value}
                options={ROLE_OPTIONS}
                searchable={false}
                label="Rol"
                placeholder="Selecciona un rol"
                onBlur={field.onBlur}
                /* Al cambiar de rol se limpia la tienda, como antes */
                onChange={(nextRole) => reset({ ...getValues(), role: nextRole, store_id: undefined })}
              />
            )}
          />
        </Field>

        {role === 'vendedor' && (
          <Field label="Tienda" htmlFor="user-store" error={errors.store_id?.message} required>
            <Controller
              name="store_id"
              control={control}
              rules={{ required: 'La tienda es obligatoria para vendedores' }}
              render={({ field }) => (
                <SearchableSelect
                  ref={field.ref}
                  value={field.value}
                  options={storeOptions}
                  loading={storesLoading}
                  icon="bx-store-alt"
                  label="Tienda"
                  placeholder="Selecciona una tienda"
                  searchPlaceholder="Buscar tienda…"
                  emptyMessage="No hay tiendas con ese nombre"
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        )}
      </div>

      <FormActions>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEditing ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </FormActions>
    </form>
  );
};