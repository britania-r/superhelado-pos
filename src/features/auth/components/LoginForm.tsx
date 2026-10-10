import { useForm, type SubmitHandler } from 'react-hook-form'; 
import { supabase } from '../../../config/supabaseClient';
import type { LoginData } from '../../../types'; 
import { useState } from 'react';
import styles from './LoginForm.module.css'; 

export const LoginForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>();

  const handleLogin: SubmitHandler<LoginData> = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;
      

    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleLogin)} className={styles.form}>
      {error && <p className={styles.errorMessage}>{error}</p>}
      
      <div className={styles.formGroup}>
        <label htmlFor="email">Correo Electrónico</label>
        <input
          id="email"
          type="email"
          placeholder="tu@email.com"
          {...register('email', { required: 'El correo es obligatorio' })}
          className={styles.input}
        />
        {errors.email && <p className={styles.validationError}>{errors.email.message}</p>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password', { required: 'La contraseña es obligatoria' })}
          className={styles.input}
        />
        {errors.password && <p className={styles.validationError}>{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={loading} className={styles.button}>
        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
};