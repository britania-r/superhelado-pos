// src/components/ui/PageHeader.tsx

import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  /** Texto corto bajo el título, por ejemplo "3 métodos" */
  subtitle?: ReactNode;
  /** Botones a la derecha (por ejemplo "Añadir") */
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <header className={styles.header}>
    <div className={styles.titles}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);