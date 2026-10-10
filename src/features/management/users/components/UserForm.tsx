import { useForm, type SubmitHandler } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { createNewUser, updateProfile, type CreateUserData, type UpdateProfileData } from '../../../../api/profiles.api';
import { getStores } from '../../../../api/stores.api';
import type { Store, Profile } from '../../../../types';
import styles from './UserForm.module.css';
import toast from 'react-hot-toast';

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

export const UserForm = ({ userToEdit, onUserSaved, onClose }: UserFormProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const { register, handleSubmit, reset, watch, getValues, formState: { isSubmitting, errors } } = useForm<UserFormData>();

  useEffect(() => {
    const loadData = async () => {
      const storesData = await getStores();
      setStores(storesData);

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
    };
    loadData();
  }, [userToEdit, reset]);

  const onSubmit: SubmitHandler<UserFormData> = async (data) => {
    try {
      if (userToEdit) {
        const updatePayload: UpdateProfileData = {
          full_name: data.full_name,
          role: data.role === 'admin' || data.role === 'vendedor' ? data.role : undefined,
          store_id: data.role === 'admin' ? null : (data.store_id || null),
        };
        await updateProfile(userToEdit.id, updatePayload);
        toast.success("Usuario actualizado con éxito!");
      } else {
        if (!data.password || data.password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }
        if (!data.role) {
          throw new Error("El rol es obligatorio para crear un usuario.");
        }

        const createPayload: CreateUserData = {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          role: data.role,
          store_id: data.role === 'admin' ? null : (data.store_id || null),
        };
        await createNewUser(createPayload);
        toast.success("Usuario creado con éxito!");
      }

      onUserSaved();
      onClose();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register("email", {
            required: !userToEdit ? "Email es obligatorio" : false,
            pattern: !userToEdit ? { value: /^\S+@\S+\.\S+$/, message: "Email inválido" } : undefined,
          })}
          disabled={!!userToEdit}
        />
        {errors.email && <span className={styles.errorText}>{errors.email.message || "Email inválido."}</span>}
      </div>

      {!userToEdit && (
        <div className={styles.formGroup}>
          <label htmlFor="password">Contraseña Temporal</label>
          <input id="password" type="password" {...register("password", { required: "Contraseña es obligatoria", minLength: { value: 6, message: "Mínimo 6 caracteres" } })} />
          {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="full_name">Nombre Completo</label>
        <input id="full_name" type="text" {...register("full_name", { required: "Nombre completo es obligatorio" })} />
        {errors.full_name && <span className={styles.errorText}>{errors.full_name.message}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="role">Rol</label>
        <select id="role" {...register("role", { required: "Rol es obligatorio" })} onChange={(e) => reset({ ...getValues(), role: e.target.value as any, store_id: undefined })}>
          <option value="">Seleccionar Rol</option>
          <option value="admin">Administrador</option>
          <option value="vendedor">Vendedor</option>
        </select>
        {errors.role && <span className={styles.errorText}>{errors.role.message}</span>}
      </div>

      {watch('role') === 'vendedor' && (
        <div className={styles.formGroup}>
          <label htmlFor="store_id">Asignar Tienda</label>
          <select id="store_id" {...register("store_id", { required: "Tienda es obligatoria para vendedores" })}>
            <option value="">Seleccionar Tienda</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          {errors.store_id && <span className={styles.errorText}>{errors.store_id.message}</span>}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
        {isSubmitting ? 'Guardando...' : 'Guardar Usuario'}
      </button>
    </form>
  );
};