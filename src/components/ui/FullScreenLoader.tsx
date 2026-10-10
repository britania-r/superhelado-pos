// src/components/ui/FullScreenLoader.tsx

import { Logo } from './Logo';
import { Spinner } from './Spinner';
import styles from './FullScreenLoader.module.css';

interface FullScreenLoaderProps {
  label?: string;
}

export const FullScreenLoader = ({ label = 'Cargando…' }: FullScreenLoaderProps) => (
  <div className={styles.screen} role="status" aria-live="polite">
    <Logo variant="mark" className={styles.mark} alt="" />
    <div className={styles.row}>
      <Spinner size="sm" label="" />
      <span>{label}</span>
    </div>
  </div>
);