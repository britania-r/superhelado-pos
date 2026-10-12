// src/features/auth/LoginPage.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { Logo } from '../../components/ui/Logo';
import { LoginForm } from './components/LoginForm';
import { InstallBanner } from '../../components/pwa/InstallBanner';
import styles from './LoginPage.module.css';

export const LoginPage = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className={styles.page}>
      {/* Panel de marca: banda superior en celular, columna izquierda en escritorio */}
      <section className={styles.brandPanel}>
        {/* Placa blanca: el logo tiene partes índigo que se pierden sobre el azul */}
        <div className={styles.logoSign}>
          <Logo className={styles.logo} />
        </div>

        <div className={styles.pitch}>
          <p className={styles.headline}>
            Cada bola,
            <br />
            una sonrisa.
          </p>
          <p className={styles.pitchText}>
            Registra ventas, controla tu caja y sigue tus tiendas desde un solo lugar.
          </p>
        </div>

        <span className={styles.badge} aria-hidden="true">
          Punto
          <br />
          de venta
        </span>
        <div className={styles.clouds} aria-hidden="true" />
      </section>

      {/* Formulario */}
      <main className={styles.formPanel}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <h1 className={styles.title}>Bienvenido de vuelta</h1>
            <p className={styles.subtitle}>Ingresa con tu cuenta para empezar a vender.</p>
          </header>
          <LoginForm />
        </div>
        <p className={styles.footer}>© {new Date().getFullYear()} Helados Chepys</p>
      </main>

      <InstallBanner placement="login" />
    </div>
  );
};