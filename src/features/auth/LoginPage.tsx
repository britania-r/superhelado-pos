
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import { LoginForm } from './components/LoginForm';
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
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <i className={`bx bxs-store-alt ${styles.logoIcon}`}></i>
        <h2>POS Super Helado</h2>
        <p>Inicia sesión para continuar</p>
        <LoginForm />
      </div>
    </div>
  );
};