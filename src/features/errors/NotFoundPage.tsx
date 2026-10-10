// src/features/errors/NotFoundPage.tsx

import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import styles from './NotFoundPage.module.css';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <main className={styles.page}>
      <Logo variant="mark" className={styles.mark} alt="" />
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Esta página se derritió</h1>
      <p className={styles.text}>La dirección no existe o fue movida.</p>
      <Button icon="bx-home-alt" onClick={() => navigate('/')}>
        Volver al inicio
      </Button>
    </main>
  );
};