// src/features/auth/components/LoginForm.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { useState } from 'react';
import { supabase } from '../../../config/supabaseClient';
import type { LoginData } from '../../../types';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import styles from './LoginForm.module.css';

/* Supabase responde en inglés: lo pasamos a mensajes claros en español */
const toFriendlyError = (err: unknown): string => {
  const e = (err ?? {}) as { code?: string; status?: number; message?: string; error_description?: string };
  const raw = e.error_description || e.message || '';
  const text = raw.toLowerCase();

  if (e.code === 'invalid_credentials' || text.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (e.code === 'email_not_confirmed' || text.includes('email not confirmed')) {
    return 'Tu correo todavía no está confirmado.';
  }
  if (e.code === 'user_banned') {
    return 'Tu usuario está bloqueado. Habla con un administrador.';
  }
  if (e.status === 429 || e.code?.startsWith('over_') || text.includes('rate limit')) {
    return 'Demasiados intentos. Espera un momento y vuelve a probar.';
  }
  if (text.includes('failed to fetch') || text.includes('network')) {
    return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  }
  return raw || 'No se pudo iniciar sesión. Inténtalo de nuevo.';
};

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
    } catch (err) {
      setError(toFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    // noValidate: sin burbujas nativas del navegador; valida react-hook-form
    <form onSubmit={handleSubmit(handleLogin)} className={styles.form} noValidate>
      {error && (
        <div className={styles.alert} role="alert">
          <i className="bx bx-error-circle" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          size="lg"
          icon="bx-envelope"
          placeholder="tu@correo.com"
          autoComplete="email"
          inputMode="email"
          {...register('email', {
            required: 'El correo es obligatorio',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Escribe un correo válido' },
          })}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          size="lg"
          icon="bx-lock-alt"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register('password', { required: 'La contraseña es obligatoria' })}
        />
      </Field>

      <Button type="submit" size="lg" fullWidth loading={loading} className={styles.submit}>
        {loading ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
};